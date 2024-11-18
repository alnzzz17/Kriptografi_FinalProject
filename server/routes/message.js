const express = require("express");
const router = express.Router();
const { uploadFields, upload } = require('../middleware/upload_file'); // Import the middleware
const {
    sendTextMessage,
    sendFileMessage,
    sendImageMessage,
    getChatPreview,
    getMessageById,
    deleteMessage
} = require("../controller/message");

// Send a message
router.post('/send/text', sendTextMessage);

// Send a message (with file upload)
router.post('/send/file', upload.single("file"), sendFileMessage);

// Send a message (with image upload)
router.post('/send/image', uploadFields, sendImageMessage);

// Messages preview
router.post('/receive/all-chat/', getChatPreview);

// Get message by ID
router.post('/get/:message_id', getMessageById);

// Delete a message
router.delete('/delete/:messageId', deleteMessage);

module.exports = router;
