const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.get("/publications/pending", verifyToken, authorizeRole("admin"), adminController.getPendingPublications);
router.patch("/publications/:id/approve", verifyToken, authorizeRole("admin"), adminController.approvePublication);
router.patch("/publications/:id/reject", verifyToken, authorizeRole("admin"), adminController.rejectPublication);
router.delete("/admin/publications/:id", verifyToken, authorizeRole("admin"), adminController.deletePublication);

router.get("/members", verifyToken, authorizeRole("admin"), adminController.getMembers);
router.get("/members/:id", verifyToken, authorizeRole("admin"), adminController.getMemberById);
router.post("/members", verifyToken, authorizeRole("admin"), adminController.createMember);
router.patch("/members/:id", verifyToken, authorizeRole("admin"), adminController.updateMember);
router.delete("/members/:id", verifyToken, authorizeRole("admin"), adminController.deleteMember);
router.patch("/members/:id/role", verifyToken, authorizeRole("admin"), adminController.updateMemberRole);

router.get("/member-profiles/:id", verifyToken, authorizeRole("admin"), adminController.getMemberProfileById);
router.post("/member-profiles", verifyToken, authorizeRole("admin"), adminController.createMemberProfile);
router.patch("/member-profiles/:id", verifyToken, authorizeRole("admin"), adminController.updateMemberProfile);
router.delete("/member-profiles/:id", verifyToken, authorizeRole("admin"), adminController.deleteMemberProfile);

module.exports = router;
