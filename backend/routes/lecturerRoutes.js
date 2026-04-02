const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const lecturerController = require("../controllers/lecturerController");

const router = express.Router();

router.get("/lecturers/public", lecturerController.getPublicLecturers);

router.get("/admin/lecturers", verifyToken, authorizeRole("admin"), lecturerController.getAdminLecturers);
router.post("/admin/lecturers", verifyToken, authorizeRole("admin"), lecturerController.createLecturer);
router.patch("/admin/lecturers/:id", verifyToken, authorizeRole("admin"), lecturerController.updateLecturer);
router.delete("/admin/lecturers/:id", verifyToken, authorizeRole("admin"), lecturerController.deleteLecturer);

module.exports = router;
