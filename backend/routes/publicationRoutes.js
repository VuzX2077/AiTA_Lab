const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const publicationController = require("../controllers/publicationController");

const router = express.Router();

router.get("/public", publicationController.getPublicPublications);
router.get("/", verifyToken, authorizeRole(["user", "admin"]), publicationController.getPublications);
router.get("/my", verifyToken, authorizeRole(["user", "admin"]), publicationController.getMyPublications);
router.post("/", verifyToken, authorizeRole(["user", "admin"]), publicationController.createPublication);
router.put("/:id", verifyToken, authorizeRole(["user", "admin"]), publicationController.updatePublication);
router.delete("/:id", verifyToken, authorizeRole(["user", "admin"]), publicationController.deletePublication);

module.exports = router;