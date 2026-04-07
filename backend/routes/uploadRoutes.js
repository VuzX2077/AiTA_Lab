    const express = require("express");
    const multer = require("multer");
    const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
    const uploadController = require("../controllers/uploadController");

    const router = express.Router();

    const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;

    const upload = multer({
        storage: multer.memoryStorage(),
        limits: {
            fileSize: MAX_IMAGE_SIZE_BYTES
        },
        fileFilter: (req, file, cb) => {
            if (!allowedMimeTypes.has(file.mimetype)) {
                return cb(new Error("Only JPEG, PNG, and WEBP images are allowed"));
            }
            return cb(null, true);
        }
    });

    router.post(
        "/uploads/images",
        verifyToken,
        authorizeRole(["admin", "user"]),
        (req, res, next) => {
            upload.single("file")(req, res, (err) => {
                if (!err) {
                    return next();
                }

                if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({ message: "Image too large. Max size is 10MB" });
                }

                return res.status(400).json({ message: err.message || "Invalid upload request" });
            });
        },
        uploadController.uploadImage
    );

    router.delete(
        "/uploads/images/:id",
        verifyToken,
        authorizeRole(["admin", "user"]),
        uploadController.deleteUploadedImage
    );

    module.exports = router;