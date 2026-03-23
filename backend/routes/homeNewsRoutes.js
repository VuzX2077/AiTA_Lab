const express = require("express");
const { verifyToken, authorizeRole } = require("../middleware/authMiddleware");
const homeNewsController = require("../controllers/homeNewsController");

const router = express.Router();

router.get("/home-news/public", homeNewsController.getPublicHomeNews);
router.get("/home-news/public/:id", homeNewsController.getPublicHomeNewsById);
router.get("/home-news/public/:id/connections", homeNewsController.getPublicHomeNewsConnections);
router.get("/home-news", verifyToken, authorizeRole("admin"), homeNewsController.getHomeNewsForAdmin);
router.get("/home-news/:id", verifyToken, authorizeRole("admin"), homeNewsController.getHomeNewsById);
router.post("/home-news", verifyToken, authorizeRole("admin"), homeNewsController.createHomeNews);
router.put("/home-news/:id", verifyToken, authorizeRole("admin"), homeNewsController.updateHomeNews);
router.delete("/home-news/:id", verifyToken, authorizeRole("admin"), homeNewsController.deleteHomeNews);

module.exports = router;