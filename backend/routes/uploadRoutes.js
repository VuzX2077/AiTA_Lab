const express = require("express");
const multer = require("multer");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");

const router = express.Router();

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024
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
                return res.status(400).json({ message: "Image too large. Max size is 5MB" });
            }

            return res.status(400).json({ message: err.message || "Invalid upload request" });
        });
    },
    uploadController.uploadImage
);

module.exports = router;