const express = require("express");
const router = express.Router();

const {
    createExercise,
    getExercises,
    getExerciseById,
    updateExercise,
    deleteExercise,
    toggleLike,
    toggleDislike,
    saveExercise,
    unsaveExercise,
} = require("../controllers/exerciseController");

const authMiddleware = require("../middleware/authMiddleware");

// Criar exercício (protegido)
router.post("/", authMiddleware, createExercise);

// Listar todos os exercícios
router.get("/", getExercises);

// Buscar exercício por ID
router.get("/:id", getExerciseById);

// Atualizar exercício (protegido)
router.put("/:id", authMiddleware, updateExercise);

// Apagar exercício (protegido)
router.delete("/:id", authMiddleware, deleteExercise);

// Like/Dislike (protegido)
router.post("/:id/like", authMiddleware, toggleLike);
router.post("/:id/dislike", authMiddleware, toggleDislike);

// Save/Unsave (protegido)
router.post("/:id/save", authMiddleware, saveExercise);
router.delete("/:id/save", authMiddleware, unsaveExercise);

module.exports = router;
