const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const homepageContentController = require("../controllers/homepageContentController");

const router = express.Router();

router.get("/homepage-content/public", homepageContentController.getPublicHomepageContent);
router.get("/admin/homepage-content", verifyToken, authorizeRole("admin"), homepageContentController.getHomepageContentForAdmin);
router.put("/admin/homepage-content", verifyToken, authorizeRole("admin"), homepageContentController.saveHomepageContent);

module.exports = router;
