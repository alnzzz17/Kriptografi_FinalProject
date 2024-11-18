const sequelize = require("../util/db_connect");
const Sequelize = require('sequelize');

const User = sequelize.define('user', {
    id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false,
        autoIncrement: true
    },
    username: {
        type: Sequelize.STRING,
        allowNull: false
    },
    password: {
        type: Sequelize.STRING,
        allowNull: false
    },
    role: {
        type: Sequelize.ENUM("Admin", "Customer"), // Removed redundant `type: Sequelize.STRING`
        defaultValue: 'Customer' // Default role
    }
}, {
    timestamps: true
});

module.exports = User;
