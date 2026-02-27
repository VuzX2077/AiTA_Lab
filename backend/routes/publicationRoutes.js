const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const publicationController = require("../controllers/publicationController");

const router = express.Router();

router.get("/publications/public", publicationController.getPublicPublications);
router.get("/publications", verifyToken, authorizeRole(["user", "admin"]), publicationController.getPublications);
router.get("/my-publications", verifyToken, authorizeRole(["user", "admin"]), publicationController.getMyPublications);
router.post("/publications", verifyToken, authorizeRole(["user", "admin"]), publicationController.createPublication);
router.put("/publications/:id", verifyToken, authorizeRole(["user", "admin"]), publicationController.updatePublication);
router.delete("/publications/:id", verifyToken, authorizeRole(["user", "admin"]), publicationController.deletePublication);

module.exports = router;