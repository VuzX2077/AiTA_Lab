const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const socialLinkIconPresetController = require("../controllers/socialLinkIconPresetController");

const router = express.Router();

router.get("/social-link-icons/public", socialLinkIconPresetController.getPublicSocialLinkIconPresets);
router.get("/admin/social-link-icons", verifyToken, authorizeRole("admin"), socialLinkIconPresetController.getSocialLinkIconPresetsForAdmin);
router.put("/admin/social-link-icons", verifyToken, authorizeRole("admin"), socialLinkIconPresetController.saveSocialLinkIconPresets);

module.exports = router;
