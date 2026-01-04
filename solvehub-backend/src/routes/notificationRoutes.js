const express = require("express");
const router = express.Router();

const {
  getNotifications,
  markAsRead,
  markAllAsRead,
} = require("../controllers/notificationController");

const authMiddleware = require("../middleware/authMiddleware");

// Todas as rotas requerem autenticação
router.get("/", authMiddleware, getNotifications);
router.post("/:id/read", authMiddleware, markAsRead);
router.post("/read-all", authMiddleware, markAllAsRead);

module.exports = router;

