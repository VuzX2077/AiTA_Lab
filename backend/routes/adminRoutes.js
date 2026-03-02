const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const adminController = require("../controllers/adminController");

const router = express.Router();

router.get("/publications/pending", verifyToken, authorizeRole("admin"), adminController.getPendingPublications);
router.patch("/publications/:id/approve", verifyToken, authorizeRole("admin"), adminController.approvePublication);
router.patch("/publications/:id/reject", verifyToken, authorizeRole("admin"), adminController.rejectPublication);
router.delete("/admin/publications/:id", verifyToken, authorizeRole("admin"), adminController.deletePublication);

router.get("/members", verifyToken, authorizeRole("admin"), adminController.getMembers);
router.post("/members", verifyToken, authorizeRole("admin"), adminController.createMember);
router.delete("/members/:id", verifyToken, authorizeRole("admin"), adminController.deleteMember);

module.exports = router;