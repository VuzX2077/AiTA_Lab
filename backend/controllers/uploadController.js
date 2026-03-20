const uploadService = require("../services/uploadService");

async function uploadImage(req, res) {
    if (!req.file) {
        return res.status(400).json({ message: "Image file is required (field: file)" });
    }

    try {
        const result = await uploadService.processAndStoreImage(req.file, req.user?.id || null);
        return res.status(201).json(result);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to upload image" });
    }
}

module.exports = {
    uploadImage
};