const Report = require("../models/Report");
const Exercise = require("../models/Exercise");
const Answer = require("../models/Answer");

exports.createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, details } = req.body;
    const reporterId = req.user.id;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({ message: "Campos obrigatórios: targetType, targetId, reason." });
    }

    if (!["EXERCISE", "ANSWER"].includes(targetType)) {
      return res.status(400).json({ message: "targetType deve ser EXERCISE ou ANSWER." });
    }

    if (!["SPAM", "OFFENSIVE", "FALSE_INFO", "OTHER"].includes(reason)) {
      return res.status(400).json({ message: "Motivo inválido." });
    }

    // Verificar se o target existe
    if (targetType === "EXERCISE") {
      const exercise = await Exercise.findById(targetId);
      if (!exercise) {
        return res.status(404).json({ message: "Exercício não encontrado." });
      }
    } else if (targetType === "ANSWER") {
      const answer = await Answer.findById(targetId).populate("exercise");
      if (!answer) {
        return res.status(404).json({ message: "Comentário não encontrado." });
      }
    }

    // Obter exerciseId
    let exerciseId = targetId;
    if (targetType === "ANSWER") {
      const answer = await Answer.findById(targetId);
      if (answer && answer.exercise) {
        exerciseId = answer.exercise;
      }
    }

    const report = new Report({
      reporter: reporterId,
      targetType,
      targetId,
      exerciseId,
      reason,
      details: details || undefined,
    });

    await report.save();
    await report.populate("reporter", "username email");

    res.status(201).json(report);
  } catch (error) {
    console.error("Erro ao criar report:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

