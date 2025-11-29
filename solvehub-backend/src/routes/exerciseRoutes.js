const express = require("express");
const router = express.Router();

const {
    createExercise,
    getExercises,
    getExerciseById,
} = require("../controllers/exerciseController");

const authMiddleware = require("../middleware/authMiddleware");

// Criar exercício (protegido)
router.post("/", authMiddleware, createExercise);

// Listar todos os exercícios
router.get("/", getExercises);

// Buscar exercício por ID
router.get("/:id", getExerciseById);

module.exports = router;
