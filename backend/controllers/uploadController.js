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
        const statusCode = Number.isInteger(error && error.statusCode) ? error.statusCode : 500;
        const message = statusCode >= 400 && statusCode < 500
            ? String(error && error.message ? error.message : "Invalid upload request")
            : "Failed to upload image";

        return res.status(statusCode).json({ message });
    }
}

async function deleteUploadedImage(req, res) {
    const imageAssetId = Number(req.params.id);
    if (!Number.isInteger(imageAssetId) || imageAssetId <= 0) {
        return res.status(400).json({ message: "Invalid image asset id" });
    }

    try {
        const result = await uploadService.deleteUploadedImageAsset({
            imageAssetId,
            actorId: req.user && req.user.id,
            actorRole: req.user && req.user.role
        });

        if (result.status === "invalid_id") {
            return res.status(400).json({ message: "Invalid image asset id" });
        }

        if (result.status === "not_found") {
            return res.status(404).json({ message: "Image asset not found" });
        }

        if (result.status === "forbidden") {
            return res.status(403).json({ message: "You are not allowed to delete this image" });
        }

        if (result.status === "in_use") {
            return res.status(409).json({ message: "Image is still in use" });
        }

        return res.json({ message: "Image deleted" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to delete image" });
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
    deleteUploadedImage,
    updateAvatar

};