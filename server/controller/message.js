require("dotenv").config();
const { Op } = require('sequelize');
const Message = require("../model/Message");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const {
    encryptText,
    decryptText,
    encryptImage,
    decryptImage,
    encryptFile,
    decryptFile
} = require('../util/encrypt');

// Controller to send a text message
const sendTextMessage = async (req, res, next) => {
    try {
        const header = req.headers;
        const authorization = header.authorization;
        let token;

        if (authorization !== undefined && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        } else {
            throw new Error("You need to login");
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        if (decoded.role !== "Admin" && decoded.role !== "Customer") {
            throw new Error("You don't have access!");
        }

        const { receiver_id, text } = req.body;
        const sender_id = decoded.id;

        const encryptedContent = encryptText(text, process.env.TOKEN_SECRET_KEY);

        if (!encryptedContent || typeof encryptedContent.data !== 'string' || typeof encryptedContent.iv !== 'string') {
            throw new Error('Failed to encrypt text message.');
        }

        const newMessage = await Message.create({
            sender_id,
            receiver_id,
            encrypted_text: encryptedContent.data,
            iv: encryptedContent.iv,
            message_type: 'text'
        });

        res.status(201).json({
            status: 'success',
            message: 'Message sent successfully!',
            data: newMessage
        });

    } catch (error) {
        console.error('Error in sendMessage:', error);
        const statusCode = error.message === 'No file provided.' ? 400 : 500;

        res.status(statusCode).json({
            status: 'error',
            message: error.message
        });
    }
};

const sendFileMessage = async (req, res) => {
    try {
        // Validasi token dari header
        const authorization = req.headers.authorization;
        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.status(401).json({ status: "error", message: "You need to login" });
        }

        const token = authorization.substring(7);
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        // Validasi role pengguna
        if (!['Admin', 'Customer'].includes(decoded.role)) {
            return res.status(403).json({ status: "error", message: "You don't have access!" });
        }

        const { receiver_id } = req.body;
        const sender_id = decoded.id;

        // Mengambil file dari req.file
        const file = req.file;
        if (!file) {
            return res.status(400).json({ status: 'error', message: 'No file provided.' });
        }

        // Enkripsi file menggunakan Triple DES
        const { encrypted, iv } = encryptFile(file.buffer, process.env.SECRET_KEY);

        // Simpan ke database
        const newMessage = await Message.create({
            sender_id,
            receiver_id,
            encrypted_file: encrypted,
            message_type: 'file',
            iv,
            mime_type: file.mimetype,
            file_size: file.size,
        });

        res.status(201).json({
            status: 'success',
            message: 'File message sent successfully!',
            newMessage,
        });
    } catch (error) {
        console.error('Error in sendFileMessage:', error.message);
        res.status(500).json({ status: 'error', message: error.message });
    }
};

const sendImageMessage = async (req, res, next) => {
    try {
        const header = req.headers;
        const authorization = header.authorization;
        let token;

        if (authorization !== undefined && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        } else {
            throw new Error("You need to login");
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        if (decoded.role !== "Admin" && decoded.role !== "Customer") {
            throw new Error("You don't have access!");
        }

        const { receiver_id, messageType } = req.body;
        const sender_id = decoded.id;

        const files = req.files;

        const coverImage = files.coverImage ? files.coverImage[0] : null;
        const secretImage = files.secretImage ? files.secretImage[0] : null;

        if (!coverImage || !secretImage) {
            throw new Error('Both cover image and secret image files are required.');
        }

        // Enkripsi gambar
        const encryptedImageBuffer = await encryptImage(coverImage.buffer, secretImage.buffer);

        // Simpan data pesan ke database
        const newMessage = await Message.create({
            sender_id,
            receiver_id,
            encrypted_file: encryptedImageBuffer, // Simpan gambar terenkripsi ke kolom encrypted_file
            message_type: 'image'
        });

        res.status(201).json({
            status: 'success',
            message: 'Message sent successfully!',
            data: {
                id: newMessage.id,
                sender_id: newMessage.sender_id,
                receiver_id: newMessage.receiver_id,
                messageType: newMessage.message_type,
                createdAt: newMessage.createdAt
            }
        });

    } catch (error) {
        console.error('Error in sendMessage:', error);
        const statusCode = error.message === 'No file provided.' ? 400 : 500;

        res.status(statusCode).json({
            status: 'error',
            message: error.message
        });
    }
};

const getChatPreview = async (req, res) => {
    try {
        const header = req.headers;
        const authorization = header.authorization;
        let token;

        if (authorization && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        } else {
            return res.status(403).json({ status: "error", message: "You need to login" });
        }

        const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        if (decoded.role !== "Admin" && decoded.role !== "Customer") {
            return res.status(403).json({ status: "error", message: "You don't have access!" });
        }

        const signedUser_id = decoded.id;
        const { userB_id } = req.body; // Ambil userB_id dari req.params

        if (!userB_id || isNaN(userB_id)) {
            return res.status(400).json({
                status: "error",
                message: "user_id (userB_id) is required and must be a number."
            });
        }

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { sender_id: signedUser_id, receiver_id: userB_id },
                    { sender_id: userB_id, receiver_id: signedUser_id }
                ]
            },
            attributes: ["id", "sender_id", "receiver_id", "message_type", "createdAt"],
            order: [['createdAt', 'ASC']]
        });

        if (!messages || messages.length === 0) {
            return res.status(404).json({ status: "error", message: "No messages found between these users." });
        }

        const chatPreview = messages.map(message => ({
            id: message.id,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            message_type: message.message_type,
            createdAt: message.createdAt
        }));

        res.status(200).json({
            status: "success",
            data: {
                userB_id: userB_id,
                total_messages: messages.length,
                messages: chatPreview
            }
        });
    } catch (error) {
        res.status(500).json({
            status: "error",
            message: "Failed to retrieve chat preview.",
            error: error.message
        });
    }
};

// Controller to receive messages
const getMessageById = async (req, res) => {
    try {
        // Ambil token dari header
        const authorization = req.headers.authorization;
        if (!authorization || !authorization.startsWith("Bearer ")) {
            return res.status(403).json({ status: "error", message: "You need to login" });
        }

        const token = authorization.substring(7);
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        if (decoded.role !== "Admin" && decoded.role !== "Customer") {
            return res.status(403).json({ status: "error", message: "You don't have access!" });
        }

        // Ambil message_id dari parameter dan userB_id dari body
        const message_id = req.params.message_id;
        const { userB_id } = req.body;

        if (!message_id || isNaN(message_id)) {
            return res.status(400).json({ status: "error", message: "message_id is required and must be a number." });
        }

        if (!userB_id || isNaN(userB_id)) {
            return res.status(400).json({ status: "error", message: "receiver_id is required and must be a number." });
        }

        const signedUser_id = decoded.id;

        // Cari pesan berdasarkan message_id, sender_id, dan receiver_id
        const message = await Message.findOne({
            where: {
                id: message_id,
                [Op.or]: [
                    { sender_id: signedUser_id, receiver_id: userB_id },
                    { sender_id: userB_id, receiver_id: signedUser_id },
                ]
            },
            attributes: [
                "id", "sender_id", "receiver_id", "encrypted_text",
                "encrypted_file", "iv", "mime_type", "message_type", "createdAt", "updatedAt"
            ]
        });

        if (!message) {
            return res.status(404).json({ status: "error", message: "Message not found." });
        }

        // Dekripsi konten pesan
        let decryptedContent = null;

        if (message.message_type === "text" && message.encrypted_text) {
            decryptedContent = decryptText(
                { data: message.encrypted_text, iv: message.iv },
                process.env.TOKEN_SECRET_KEY
            );

        } else if (message.message_type === "file" && message.encrypted_file) {
            try {
                // Pastikan direktori sementara untuk menyimpan file sementara
                const tempDir = path.join(__dirname, '../temp');
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                console.log('Decrypting file with MIME type:', message.mime_type);

                // Dekripsi file menggunakan Triple DES
                const decryptedData = decryptFile(
                    message.encrypted_file,
                    message.iv,
                    process.env.SECRET_KEY
                );

                if (!decryptedData) {
                    throw new Error('Decryption returned null content.');
                }

                // Tentukan nama file berdasarkan MIME type
                const extension = getMimeType(message.mime_type);
                const fileName = `decrypted_file_${message.id}${extension}`;
                const tempFilePath = path.join(tempDir, fileName);

                // Tulis hasil dekripsi ke file sementara
                fs.writeFileSync(tempFilePath, decryptedData);

                // Siapkan response untuk mendownload file
                res.setHeader('Content-Type', message.mime_type);
                res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
                res.setHeader('Content-Length', fs.statSync(tempFilePath).size);

                // Kirim file ke client menggunakan stream
                const fileStream = fs.createReadStream(tempFilePath);

                // **Tambahkan Handler untuk Streaming File**
                fileStream.pipe(res);

                fileStream.on('end', () => {
                    // Hapus file sementara setelah streaming selesai
                    if (fs.existsSync(tempFilePath)) {
                        fs.unlinkSync(tempFilePath);
                    }
                });

                fileStream.on('error', (error) => {
                    console.error('Error streaming file:', error.message);
                    if (!res.headersSent) { // Pastikan header belum dikirim sebelum mengirim error
                        res.status(500).json({ status: 'error', message: 'Error streaming file' });
                    }
                });

            } catch (error) {
                console.error('File handling error:', error.message);
                if (!res.headersSent) {
                    res.status(500).json({ status: 'error', message: error.message });
                }
            }
        } else if (message.message_type === "image" && message.encrypted_file) {
            try {
                const tempDir = path.join(__dirname, "../temp");
                if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                }

                const tempStegoPath = path.join(tempDir, `stego_image_${message.id}.png`);
                const tempDecryptedPath = path.join(tempDir, `decrypted_image_${message.id}.png`);

                // Tulis data steganografi ke file sementara
                fs.writeFileSync(tempStegoPath, Buffer.from(message.encrypted_file));

                // Dekripsi gambar
                await decryptImage(tempStegoPath, tempDecryptedPath);

                // URL untuk mengunduh gambar terenkripsi
                const encryptedFileUrl = `/temp/stego_image_${message.id}.png`;

                // URL untuk mengunduh gambar yang telah didekripsi
                const decryptedFileUrl = `/temp/decrypted_image_${message.id}.png`;

                // Mengirim response JSON dengan URL gambar terenkripsi dan dekripsi
                return res.status(200).json({
                    status: "success",
                    data: {
                        id: message.id,
                        sender_id: message.sender_id,
                        receiver_id: message.receiver_id,
                        message_type: message.message_type,
                        createdAt: message.createdAt,
                        encrypted_content_url: encryptedFileUrl,
                        decrypted_content_url: decryptedFileUrl
                    }
                });
            } catch (error) {
                console.error("Image decryption error:", error.message);
                return res.status(500).json({ status: "error", message: "Failed to decrypt and download image." });
            }
        }

        // Tambahkan hasil dekripsi ke respons
        const responseMessage = {
            id: message.id,
            sender_id: message.sender_id,
            receiver_id: message.receiver_id,
            message_type: message.message_type,
            createdAt: message.createdAt,
            encrypted_content: message.encrypted_text || message.encrypted_file,
            decrypted_content: decryptedContent
        };

        return res.status(200).json({
            status: "success",
            data: responseMessage
        });

    } catch (error) {
        console.error(error.message);
        if (!res.headersSent) {
            return res.status(500).json({
                status: "error",
                message: "Failed to retrieve the message.",
                error: error.message
            });
        }
    }
};

const getMimeType = (mimeType) => {
    switch (mimeType) {
        case 'application/pdf':
            return '.pdf';
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return '.docx';
        case 'application/msword':
            return '.doc';
        case 'image/png':
            return '.png';
        case 'image/jpeg':
            return '.jpg';
        case 'text/plain':
            return '.txt';
        default:
            console.warn('Unsupported MIME type:', mimeType);
            return ''; // Jangan kembalikan 'application/octet-stream' sebagai ekstensi.
    }
};

// Controller to delete a message
const deleteMessage = async (req, res) => {
    try {

        //mengambil token
        const header = req.headers;
        const authorization = header.authorization;
        let token;

        if (authorization !== undefined && authorization.startsWith("Bearer ")) {
            token = authorization.substring(7);
        } else {
            const error = new Error("You need to login");
            error.statusCode = 403;
            throw error;
        }

        //extract payload untuk mendapatkan userId dan role
        const decoded = jwt.verify(token, process.env.TOKEN_SECRET_KEY);

        if (decoded.role !== "Admin") {
            const error = new Error("You don't have access!");
            error.statusCode = 403; //forbidden
            throw error;
        }

        const { messageId } = req.params;
        const user_id = decoded.id;
        const userRole = decoded.role;

        const message = await Message.findByPk(messageId);
        if (!message) {
            return res.status(404).json({
                status: 'error',
                message: 'Message not found.'
            });
        }

        if (userRole !== 'Admin' && message.sender_id !== user_id) {
            return res.status(403).json({
                status: 'error',
                message: 'Unauthorized to delete this message.'
            });
        }

        await message.destroy();
        res.status(200).json({
            status: 'success',
            message: 'Message deleted successfully.'
        });

    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

module.exports = {
    sendTextMessage,
    sendFileMessage,
    sendImageMessage,
    getChatPreview,
    getMessageById,
    deleteMessage
};