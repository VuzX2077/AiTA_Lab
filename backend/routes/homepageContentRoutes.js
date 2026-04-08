const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const homepageContentController = require("../controllers/homepageContentController");

const router = express.Router();

router.get("/homepage-content/public", homepageContentController.getPublicHomepageContent);
router.get("/admin/homepage-content", verifyToken, authorizeRole("admin"), homepageContentController.getHomepageContentForAdmin);
router.put("/admin/homepage-content", verifyToken, authorizeRole("admin"), homepageContentController.saveHomepageContent);
router.patch("/admin/homepage-content/hero-image/:slot", verifyToken, authorizeRole("admin"), homepageContentController.replaceHomepageHeroImage);

module.exports = router;
