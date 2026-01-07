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
// MULTER CONFIG (Memory Storage para Cloudinary)
// ===============================
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Aceitar apenas imagens
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Apenas imagens permitidas"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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
