const Exercise = require("../models/Exercise");

exports.createExercise = async (req, res) => {
  try {
    const { title, description, subject } = req.body;

    const exercise = new Exercise({
      title,
      description,
      subject,
      author: req.user.id,
    });

    await exercise.save();
    res.json(exercise);

  } catch (err) {
    res.status(500).json({ message: "Erro ao criar exercício" });
  }
};

exports.getExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find()
      .populate("author", "username")
      .sort({ createdAt: -1 });

    res.json(exercises);

  } catch (err) {
    res.status(500).json({ message: "Erro ao carregar exercícios" });
  }
};

exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id)
      .populate("author", "username");

    if (!exercise) return res.status(404).json({ message: "Exercício não encontrado" });

    res.json(exercise);

  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar exercício", error: err });
  }
};
