const sequelize = require("../util/db_connect");
const Sequelize = require("sequelize");
const { encryptIV, decryptIV } = require("../util/encrypt");
const User = require("./User");

const Message = sequelize.define(
    "message",
    {
        id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            allowNull: false,
            autoIncrement: true,
        },
        sender_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: "id",
            },
            onDelete: "CASCADE",
        },
        receiver_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: User,
                key: "id",
            },
            onDelete: "CASCADE",
        },
        encrypted_text: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: "Encrypted text content for text messages",
        },
        encrypted_file: {
            type: Sequelize.BLOB("long"),
            allowNull: true,
            comment: "Encrypted file content for all types of files",
        },
        iv: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "Initialization vector (nonce) for decryption if needed",
            set(value) {
                // Encrypt the IV before storing it in the database
                const encryptedIV = encryptIV(value);
                this.setDataValue("iv", encryptedIV);
            },
            get() {
                // Decrypt the IV when reading from the database
                const encryptedIV = this.getDataValue("iv");
                if (!encryptedIV) return null;
                return decryptIV(encryptedIV);
            },
        },
        message_type: {
            type: Sequelize.ENUM("text", "image", "file"),
            allowNull: false,
            comment: "Indicates the type of message content",
            defaultValue: "text",
        },
        mime_type: {
            type: Sequelize.STRING,
            allowNull: true,
            comment: "MIME type of the file (e.g., application/pdf, image/png)",
        },
        file_size: {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: "Size of the file in bytes",
        },
    },
    {
        timestamps: true,
    }
);

module.exports = Message;