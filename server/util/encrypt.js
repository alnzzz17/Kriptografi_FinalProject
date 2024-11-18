const crypto = require('crypto');
const sharp = require('sharp');

// --- Text Encryption Functions ---

// Caesar Cipher (Text)
const caesarCipherEncrypt = (text, shift = 18) => {
    return text.split('').map(char => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
            return String.fromCharCode(((code - 65 + shift) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
            return String.fromCharCode(((code - 97 + shift) % 26) + 97);
        }
        return char;
    }).join('');
};

const caesarCipherDecrypt = (text, shift = 18) => {
    return text.split('').map((char) => {
        const code = char.charCodeAt(0);
        if (code >= 65 && code <= 90) {
            return String.fromCharCode(((code - 65 - shift + 26) % 26) + 65);
        } else if (code >= 97 && code <= 122) {
            return String.fromCharCode(((code - 97 - shift + 26) % 26) + 97);
        }
        return char;
    }).join('');
};

// AES-256-CBC (Text)
const aesEncryptText = (text, secretKey) => {
    if (secretKey.length !== 64)
        throw new Error("Secret key invalid.");

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc',
        Buffer.from(secretKey, 'hex'), iv);

    let encrypted = cipher.update(text, 'utf-8', 'hex');
    encrypted += cipher.final('hex');
    return { iv: iv.toString('hex'), data: encrypted };
};

const aesDecryptText = (encryptedText, secretKey, iv) => {
    const decipher = crypto.createDecipheriv('aes-256-cbc',
        Buffer.from(secretKey, 'hex'), Buffer.from(iv, 'hex'));
    let decrypted = decipher.update(encryptedText, 'hex', 'utf-8');
    decrypted += decipher.final('utf-8');
    return decrypted;
};

// Text Encrypt and Decrypt
const encryptText = (text, secretKey) => {
    const caesarEncrypted = caesarCipherEncrypt(text);
    return aesEncryptText(caesarEncrypted, secretKey);
};

const decryptText = (encryptedData, secretKey) => {
    const aesDecrypted = aesDecryptText(encryptedData.data,
        secretKey, encryptedData.iv);
    return caesarCipherDecrypt(aesDecrypted);
};

// --- File Encryption (3DES) ---

/**
 * Fungsi untuk mengenkripsi file menggunakan Triple DES (3DES)
 * @param {Buffer} buffer - Data dalam bentuk buffer
 * @param {string} secretKey - Kunci rahasia
 * @returns {Object} - Hasil enkripsi (data terenkripsi dan IV)
 */
const encryptFile = (buffer, secretKey) => {
    try {
        const adjustedKey = Buffer.from(secretKey.slice(0, 48), 'hex'); // Ambil hanya 24 byte
        const iv = crypto.randomBytes(8); // IV dengan panjang 8 byte (64-bit)

        const cipher = crypto.createCipheriv('des-ede3-cbc', adjustedKey, iv);
        cipher.setAutoPadding(true);

        const encryptedData = Buffer.concat([
            cipher.update(buffer),
            cipher.final(),
        ]);

        return {
            encrypted: encryptedData.toString('base64'),
            nonce: iv.toString('base64'),
        };
    } catch (error) {
        console.error('Encryption error:', error);
        throw new Error(`Encryption failed: ${error.message}`);
    }
};

/**
 * Fungsi untuk mendekripsi file terenkripsi menggunakan Triple DES (3DES)
 * @param {Buffer} encryptedDataBase64 - Data terenkripsi dalam base64
 * @param {string} ivBase64 - Initialization Vector (IV) dalam base64
 * @param {string} secretKey - Kunci rahasia
 * @returns {Buffer} - Data yang telah didekripsi
 */
const decryptFile = (encryptedDataBase64, ivBase64, secretKey) => {
    try {
        console.log('DecryptFile Input:', {
            encryptedDataBase64: encryptedDataBase64?.slice(0, 30), // Potong untuk keamanan
            ivBase64,
            secretKey: secretKey?.slice(0, 10), // Potong untuk keamanan
        });

        const key = Buffer.from(secretKey.slice(0, 48), 'hex');
        const iv = Buffer.from(ivBase64, 'base64');
        const encryptedData = Buffer.from(encryptedDataBase64, 'base64');

        const decipher = crypto.createDecipheriv('des-ede3-cbc', key, iv);
        decipher.setAutoPadding(true);

        const decryptedData = Buffer.concat([
            decipher.update(encryptedData),
            decipher.final(),
        ]);

        return decryptedData;
    } catch (error) {
        console.error('Decryption error:', error);
        throw new Error(`Decryption failed: ${error.message}`);
    }
};

// --- Image Steganography (Encrypt and Decrypt) ---

const encryptImage = async (coverImagePath, secretImagePath) => {
    try {
        // Baca dan resize gambar cover dan secret
        const coverImage = sharp(coverImagePath).resize(500, 500).ensureAlpha().raw();
        const secretImage = sharp(secretImagePath).resize(500, 500).ensureAlpha().raw();

        // Mendapatkan data buffer untuk gambar cover dan secret
        const [coverData, secretData] = await Promise.all([
            coverImage.toBuffer(),
            secretImage.toBuffer()
        ]);

        if (coverData.length !== secretData.length) {
            throw new Error("Cover image and secret image dimensions or channels do not match.");
        }

        // Proses steganografi (menggunakan 4 bit paling signifikan dari secret image)
        const stegoBuffer = Buffer.alloc(coverData.length);
        for (let i = 0; i < coverData.length; i++) {
            const secretNibble = (secretData[i] & 0xF0) >> 4; // Ambil 4 MSB dari secretData
            stegoBuffer[i] = (coverData[i] & 0xF0) | secretNibble; // Sisipkan ke 4 LSB dari coverData
        }

        // Konversi buffer hasil enkripsi ke format PNG
        const encryptedImageBuffer = await sharp(stegoBuffer, {
            raw: { width: 500, height: 500, channels: 4 }
        })
            .png()
            .toBuffer();

        return encryptedImageBuffer;
    } catch (error) {
        throw new Error(`Error during image steganography: ${error.message}`);
    }
};

const decryptImage = async (stegoImagePath, outputImagePath) => {
    try {
        // Membaca gambar steganografi dan mengonversi ke data mentah (raw)
        const stegoImage = sharp(stegoImagePath).raw();
        const { data: stegoData, info } = await stegoImage.toBuffer({ resolveWithObject: true });

        // Mengecek dimensi dan kanal
        const channels = info.channels;
        const width = info.width;
        const height = info.height;

        if (channels !== 4) {
            throw new Error("Expected 4 channels (RGBA) in the stego image.");
        }

        // Buat buffer untuk gambar hasil dekripsi
        const secretBuffer = Buffer.alloc(stegoData.length);

        // Ekstraksi 4 LSB dari stegoData dan rekonstruksi gambar asli
        for (let i = 0; i < stegoData.length; i++) {
            const extractedNibble = stegoData[i] & 0x0F; // Ambil 4 LSB
            secretBuffer[i] = (extractedNibble << 4) | extractedNibble; // Duplikasi nibble untuk meningkatkan kualitas
        }

        // Konversi buffer hasil ekstraksi menjadi file gambar
        await sharp(secretBuffer, {
            raw: { width, height, channels }
        })
            .png()
            .toFile(outputImagePath);

        return outputImagePath;
    } catch (error) {
        throw new Error(`Error during image extraction: ${error.message}`);
    }
};

// Konfigurasi kunci enkripsi
const SECRET_KEY = process.env.TOKEN_SECRET_KEY;

if (SECRET_KEY.length !== 64) {
    throw new Error("Secret key must be 32 bytes (64 hex characters) for AES.");
}

const encryptIV = (iv) => {
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(SECRET_KEY, "hex"), Buffer.alloc(16, 0)); // IV untuk enkripsi IV bisa berupa nol
    let encrypted = cipher.update(iv, "hex", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
};

const decryptIV = (encryptedIV) => {
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(SECRET_KEY, "hex"), Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedIV, "hex", "hex");
    decrypted += decipher.final("hex");
    return decrypted;
};

module.exports = {
    encryptText,
    decryptText,
    encryptImage,
    decryptImage,
    encryptFile,
    decryptFile,
    encryptIV,
    decryptIV
};
