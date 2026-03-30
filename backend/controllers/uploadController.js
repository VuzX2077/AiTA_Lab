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

async function updateAvatar(req, res) {
    try {
        const userId = req.user.id;

        const user = await userRepository.findById(userId);

        if (user.avatar_key) {
            await uploadService.deleteImage(user.avatar_key);
        }

        const newImage = await uploadService.processAndStoreImage(req.file, userId);

        await userRepository.updateAvatar(userId, newImage.key, newImage.url);

        return res.json({
            message: "Avatar updated",
            avatar: newImage.url
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to update avatar" });
    }
}

module.exports = {
    uploadImage,
    updateAvatar

};