const express = require("express");
const router = express.Router();
const { getSubjects } = require("../controllers/subjectController");

// Endpoint público para obter todas as disciplinas
router.get("/", getSubjects);

module.exports = router;

