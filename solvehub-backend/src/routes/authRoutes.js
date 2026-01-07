const express = require("express");
const router = express.Router();
const multer = require("multer");

const {
  register,
  login,
  getMe,
  updateMe,
  uploadAvatar,
  changePassword,
  getSavedExercises,
  getNotificationSettings,
  updateNotificationSettings
} = require("../controllers/authController");

const authMiddleware = require("../middleware/authMiddleware");

// ===============================
// MULTER CONFIG
// ===============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = file.originalname.split(".").pop();
    cb(null, `${req.user.id}-${Date.now()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

// ===============================
// AUTH
// ===============================
router.post("/register", register);
router.post("/login", login);

// ===============================
// USER LOGADO
// ===============================
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.post("/me/avatar", authMiddleware, upload.single("avatar"), uploadAvatar);
router.put("/password", authMiddleware, changePassword);
router.get("/me/saved", authMiddleware, getSavedExercises);
router.get("/me/notification-settings", authMiddleware, getNotificationSettings);
router.put("/me/notification-settings", authMiddleware, updateNotificationSettings);

module.exports = router;
