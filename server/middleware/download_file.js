const axios = require('axios');
const fs = require('fs');
const path = require('path');

const downloadFile = async (url, outputPath) => {
    try {
        const response = await axios({
            method: 'get',
            url,
            responseType: 'arraybuffer',
            headers: {
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br'
            }
        });

        // Pastikan direktori ada
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Tulis file
        await fs.promises.writeFile(outputPath, Buffer.from(response.data));
        console.log(`File downloaded successfully to: ${outputPath}`);
        return outputPath;
    } catch (error) {
        console.error('Download error:', error.message);
        throw new Error(`Failed to download file: ${error.message}`);
    }
};

module.exports = { downloadFile };
