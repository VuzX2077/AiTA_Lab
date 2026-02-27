const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const memberController = require("../controllers/memberController");

const router = express.Router();

router.get("/profile", verifyToken, authorizeRole(["user", "admin"]), memberController.getProfile);

module.exports = router;