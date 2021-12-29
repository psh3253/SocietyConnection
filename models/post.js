const Sequelize = require('sequelize');

module.exports = class Post extends Sequelize.Model {
    static init(sequelize) {
        return super.init({
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
            },
            title: {
                type: Sequelize.STRING(50),
                allowNull: false,
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            view_count: {
                type: Sequelize.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
            },
            is_notice: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            }
        }, {
            sequelize,
            timestamps: true,
            underscored: true,
            modelName: 'Post',
            tableName: 'posts',
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
        });
    }

    static associate(db) {
        db.Post.hasMany(db.Comment, { foreignKey: 'post_id', sourceKey: 'id'});
        db.Post.hasMany(db.Post_file, { foreignKey: 'post_id', sourceKey: 'id'});
        db.Post.belongsToMany(db.User, {foreignKey: 'post_id', through: 'Like'});
        db.Post.belongsTo(db.User, {foreignKey: 'creator_id', targetKey: 'id'});
        db.Post.belongsTo(db.Board, {foreignKey: 'board_id', targetKey: 'id'});
    }
};