const express = require('express');
const router = express.Router();
const {isLoggedIn} = require('./middlewares');
const {sequelize, Post, Board, Recruitment, User, Grade} = require('../models');
const multer = require("multer");
const path = require("path");
const fs = require("fs");

try {
    fs.readdirSync('./uploads/post');
} catch (error) {
    console.error('uploads/post 폴더가 없어 uploads 폴더를 생성합니다.');
    fs.mkdirSync('./uploads/post');
}

try {
    fs.readdirSync('./uploads/post/img');
} catch (error) {
    console.error('uploads/post/img 폴더가 없어 uploads 폴더를 생성합니다.');
    fs.mkdirSync('./uploads/post/img');
}

const img_upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'uploads/post/img/');
        },
        filename(req, file, cb) {
            const ext = path.extname(file.originalname);
            cb(null, path.basename(file.originalname, ext) + ext);
        },
    }),
    limits: {fileSize: 10 * 1024 * 1024},
});

router.post('/upload', img_upload.single('img'), async (req, res, next) => {
    const filename = req.file.filename;
    let fileInfo = "";
    fileInfo += "&bNewLine=true";
    fileInfo += "&sFileName=" + filename;
    fileInfo += "&sFileURL=/uploads/post/img/" + filename;
    res.send(fileInfo);
});

router.get('/:board_id/write', isLoggedIn, async (req, res, next) => {
    const board_id = req.params.board_id;
    const user_id = req.user.id;
    try {
        const board = await Board.findOne({
            attributes: ['id', 'board_type', 'name', 'min_write_grade'],
            where: {
                id: board_id
            }
        });
        const user = await User.findOne({
            attributes: ['grade'],
            where: {
                id: user_id
            }
        })
        if (user.grade >= board.min_write_grade) {
            res.render('post_write', {
                board: board
            });
        } else {
            const grade = await Grade.findOne({
                attributes: ['name'],
                where: {
                    id: board.min_write_grade
                }
            });
            res.send('<script>alert("게시글을 작성할 수 있는 권한이 없습니다. 이 게시판은 ' + grade.name + '등급부터 쓸 수 있습니다.");history.back();</script>');
        }
    } catch (err) {
        console.error(err);
        next(err);
    }
});

router.post('/:board_id/write', isLoggedIn, async (req, res, next) => {
    const board_id = req.params.board_id;
    const title = req.body.title;
    const content = req.body.ir1;
    const deadline = req.body.deadline;
    const creator_id = req.user.id;
    console.log(content);
    try {
        const board = await Board.findOne({
            attributes: ['board_type'],
            where: {
                id: board_id
            }
        });
        let post;
        if (board.board_type === 'general') {
            post = await Post.create({
                title: title,
                content: content,
                board_id: board_id,
                creator_id: creator_id
            });
        } else if (board.board_type === 'recruitment') {
            const offset = new Date().getTimezoneOffset() * 60000;
            const date = new Date(Date.now() - offset);
            if (deadline < date)
                return res.send('<script>alert("마감 기한은 현재 시각 이전으로 설정할 수 없습니다.");history.back();</script>');
            else {
                post = await Recruitment.create({
                    title: title,
                    content: content,
                    board_id: board_id,
                    creator_id: creator_id,
                    deadline: deadline
                });
            }
        }
        res.redirect(`/post/${post.id}?board_id=${board_id}`);
    } catch (err) {
        console.error(err);
        next(err);
    }
})

router.get('/:board_id', async (req, res, next) => {
    const board_id = req.params.board_id;
    const sort = req.query.sort || 'created_at';
    const page = req.query.page || 1;
    const start_post_number = page * 10 - 10;
    try {
        const board = await Board.findOne({
            attributes: ['id', 'board_type', 'name'],
            where: {
                id: board_id
            }
        });
        if (board.board_type === 'general') {
            let order;
            if (sort === 'like') {
                order = [['is_notice', 'DESC'], [sequelize.literal('`like`'), 'DESC'], ['id', 'DESC']];
            } else {
                order = [['is_notice', 'DESC'], ['id', 'DESC']]
            }
            const posts = await Post.findAll({
                attributes: ['id', 'title', 'created_at', 'is_notice', 'view_count', [
                    sequelize.literal('(SELECT count(*) FROM `like` WHERE `post_id` = `post`.`id`)'), 'like'
                ], [
                    sequelize.literal('(SELECT count(*) FROM `comment` WHERE `post_id` = `post`.`id`)'), 'comment'
                ]],
                where: {
                    board_id: board_id
                },
                include: [{
                    model: User,
                    attributes: ['nickname']
                }],
                order: order,
                offset: start_post_number,
                limit: 10,
            });
            const post_count = await Post.count({
                where: {
                    board_id: board_id
                }
            });
            res.render('board', {
                    board: board,
                    posts: posts,
                    post_count: post_count,
                    page: page
                }
            );
        } else if (board.board_type === 'recruitment') {
            const recruitments = await Recruitment.findAll({
                attributes: ['id', 'title', 'created_at', 'view_count', 'deadline'],
                where: {
                    board_id: board_id
                },
                include: [{
                    model: User,
                    attributes: ['nickname']
                }],
                offset: start_post_number,
                limit: 10,
                order: [
                    ['created_at', 'DESC'],
                ]
            });

            const recruitment_count = await Recruitment.count({
                where: {
                    board_id: board_id
                }
            });
            res.render('board', {
                board: board,
                posts: recruitments,
                post_count: recruitment_count,
                page: page
            });
        }
    } catch (err) {
        console.error(err);
        next(err);
    }
});

module.exports = router;