const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");

const router = express.Router();

// Route cho user & admin
router.get("/profile", verifyToken, (req, res) => {
    res.json({
        message: "This is protected profile data",
        user: req.user
    });
});

// Route chỉ admin
router.get("/admin", verifyToken, authorizeRole("admin"), (req, res) => {
    res.json({
        message: "Welcome Admin",
    });
});

module.exports = router;