const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const memberController = require("../controllers/memberController");

const router = express.Router();

router.get("/members/public", memberController.getPublicMembers);
router.get("/members/public/:id", memberController.getPublicMemberDetail);
router.get("/profile", verifyToken, authorizeRole(["user", "admin"]), memberController.getProfile);
router.patch("/profile", verifyToken, authorizeRole(["user", "admin"]), memberController.updateProfile);
router.get("/profile/public-page", verifyToken, authorizeRole(["user", "admin"]), memberController.getOwnPublicPage);
router.patch("/profile/public-page", verifyToken, authorizeRole(["user", "admin"]), memberController.updateOwnPublicPage);

module.exports = router;
