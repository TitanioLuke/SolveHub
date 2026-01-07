const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const {
  getSubjects,
  createSubject,
  updateSubject,
  deleteSubject,
  getSubjectById,
  getTags,
  createTag,
  updateTag,
  deleteTag,
  getTagById,
  getReports,
  updateReport,
  deleteReport,
  getUsers,
  updateUserRole,
  deleteExercise,
  deleteAnswer,
} = require("../controllers/adminController");

// Todas as rotas requerem autenticação e ser admin
router.use(authMiddleware);
router.use(adminMiddleware);

// ===============================
// SUBJECTS
// ===============================
router.get("/subjects", getSubjects);
router.post("/subjects", createSubject);
router.get("/subjects/:id", getSubjectById);
router.put("/subjects/:id", updateSubject);
router.delete("/subjects/:id", deleteSubject);

// ===============================
// TAGS
// ===============================
router.get("/tags", getTags);
router.post("/tags", createTag);
router.get("/tags/:id", getTagById);
router.put("/tags/:id", updateTag);
router.delete("/tags/:id", deleteTag);

// ===============================
// REPORTS
// ===============================
router.get("/reports", getReports);
router.put("/reports/:id", updateReport);
router.delete("/reports/:id", deleteReport);

// ===============================
// USERS / ROLES
// ===============================
router.get("/users", getUsers);
router.put("/users/:id/role", updateUserRole);

// ===============================
// DELETE CONTENT
// ===============================
router.delete("/exercises/:id", deleteExercise);
router.delete("/answers/:id", deleteAnswer);

module.exports = router;

