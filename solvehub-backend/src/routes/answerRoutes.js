const express = require("express");
const router = express.Router();

const {
  createAnswer,
  getAnswersByExercise,
  getAnswersCount,
  toggleLike,
  toggleDislike
} = require("../controllers/answerController");

const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

// Criar resposta (protegido)
router.post("/", authMiddleware, createAnswer);

// Listar respostas de um exercício (autenticação opcional para mostrar hasLiked/hasDisliked)
router.get("/exercise/:exerciseId", optionalAuthMiddleware, getAnswersByExercise);

// Contar respostas de um exercício (para o card)
router.get("/exercise/:exerciseId/count", getAnswersCount);

// Like/Dislike (protegido)
router.post("/:answerId/like", authMiddleware, toggleLike);
router.post("/:answerId/dislike", authMiddleware, toggleDislike);

module.exports = router;

