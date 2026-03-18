const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const seminarController = require("../controllers/seminarController");

const router = express.Router();

router.get("/seminars/public", seminarController.getPublicSeminars);
router.get("/seminars", verifyToken, authorizeRole("admin"), seminarController.getAllSeminars);
router.post("/seminars", verifyToken, authorizeRole("admin"), seminarController.createSeminar);
router.put("/seminars/:id", verifyToken, authorizeRole("admin"), seminarController.updateSeminar);
router.delete("/seminars/:id", verifyToken, authorizeRole("admin"), seminarController.deleteSeminar);

module.exports = router;
