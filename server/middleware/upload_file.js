const multer = require('multer');
const storage = multer.memoryStorage();

// Perbaikan: parameter pertama adalah `req`, bukan langsung `file`
const fileFilterImages = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
};

const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
        'text/plain', // TXT
        'application/pdf' // PDF
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only DOCX, TXT, and PDF are allowed.'));
    }
};

const uploadImages = multer({
    storage,
    fileFilterImages,
    limits: { fileSize: 10 * 1024 * 1024 } // Batas ukuran file 10MB
});

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // Batas ukuran file 10MB
});

// Middleware untuk menerima dua file
const uploadFields = uploadImages.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'secretImage', maxCount: 1 }
]);

module.exports = { upload, uploadFields };