const Subject = require("../models/Subject");
const Tag = require("../models/Tag");
const Report = require("../models/Report");
const User = require("../models/User");
const Exercise = require("../models/Exercise");
const Answer = require("../models/Answer");

// ===============================
// SUBJECTS
// ===============================

exports.getSubjects = async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ createdAt: -1 });
    
    // Adicionar contagem de exercícios para cada disciplina
    const subjectsWithCount = await Promise.all(
      subjects.map(async (subject) => {
        const exerciseCount = await Exercise.countDocuments({ subject: subject.name });
        return {
          ...subject.toObject(),
          exerciseCount,
        };
      })
    );

    res.json(subjectsWithCount);
  } catch (error) {
    console.error("Erro ao obter disciplinas:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const { name, isPopular } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "O nome da disciplina é obrigatório." });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: "O nome não pode ter mais de 100 caracteres." });
    }

    const subject = new Subject({ 
      name: name.trim(),
      isPopular: isPopular === true || isPopular === "true"
    });
    await subject.save();

    res.status(201).json(subject);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Já existe uma disciplina com este nome." });
    }
    console.error("Erro ao criar disciplina:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "O nome da disciplina é obrigatório." });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: "O nome não pode ter mais de 100 caracteres." });
    }

    const updateData = { name: name.trim() };
    
    // Atualizar isPopular se fornecido
    if (req.body.hasOwnProperty('isPopular')) {
      updateData.isPopular = req.body.isPopular === true || req.body.isPopular === "true";
    }
    
    const subject = await Subject.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!subject) {
      return res.status(404).json({ message: "Disciplina não encontrada." });
    }

    res.json(subject);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Já existe uma disciplina com este nome." });
    }
    console.error("Erro ao atualizar disciplina:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({ message: "Disciplina não encontrada." });
    }

    await Subject.findByIdAndDelete(id);
    res.json({ message: "Disciplina removida com sucesso." });
  } catch (error) {
    console.error("Erro ao remover disciplina:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.getSubjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const subject = await Subject.findById(id);

    if (!subject) {
      return res.status(404).json({ message: "Disciplina não encontrada." });
    }

    res.json(subject);
  } catch (error) {
    console.error("Erro ao obter disciplina:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// ===============================
// TAGS
// ===============================

exports.getTags = async (req, res) => {
  try {
    const tags = await Tag.find().sort({ createdAt: -1 });
    res.json(tags);
  } catch (error) {
    console.error("Erro ao obter tags:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.createTag = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "O nome da tag é obrigatório." });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: "O nome não pode ter mais de 100 caracteres." });
    }

    const tag = new Tag({ name: name.trim() });
    await tag.save();

    res.status(201).json(tag);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Já existe uma tag com este nome." });
    }
    console.error("Erro ao criar tag:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "O nome da tag é obrigatório." });
    }

    if (name.length > 100) {
      return res.status(400).json({ message: "O nome não pode ter mais de 100 caracteres." });
    }

    const tag = await Tag.findByIdAndUpdate(
      id,
      { name: name.trim() },
      { new: true, runValidators: true }
    );

    if (!tag) {
      return res.status(404).json({ message: "Tag não encontrada." });
    }

    res.json(tag);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "Já existe uma tag com este nome." });
    }
    console.error("Erro ao atualizar tag:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    const tag = await Tag.findById(id);
    if (!tag) {
      return res.status(404).json({ message: "Tag não encontrada." });
    }

    await Tag.findByIdAndDelete(id);
    res.json({ message: "Tag removida com sucesso." });
  } catch (error) {
    console.error("Erro ao remover tag:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.getTagById = async (req, res) => {
  try {
    const { id } = req.params;
    const tag = await Tag.findById(id);

    if (!tag) {
      return res.status(404).json({ message: "Tag não encontrada." });
    }

    res.json(tag);
  } catch (error) {
    console.error("Erro ao obter tag:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// ===============================
// REPORTS
// ===============================

exports.getReports = async (req, res) => {
  try {
    const { type, status } = req.query;
    
    const filter = {};
    if (type) filter.targetType = type;
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate("reporter", "username email")
      .populate("exerciseId", "title")
      .sort({ createdAt: -1 });

    // Popular dados do target (exercício ou comentário)
    const reportsWithTarget = await Promise.all(
      reports.map(async (report) => {
        const reportObj = report.toObject();
        
        if (report.targetType === "EXERCISE") {
          const exercise = await Exercise.findById(report.targetId).select("title description");
          if (exercise) {
            reportObj.target = {
              title: exercise.title,
              description: exercise.description?.substring(0, 150) + (exercise.description?.length > 150 ? "..." : ""),
            };
          }
          // Garantir que exerciseId está definido para exercícios
          if (!reportObj.exerciseId) {
            reportObj.exerciseId = {
              _id: report.targetId,
              title: exercise?.title || "Exercício",
            };
          } else if (typeof reportObj.exerciseId === "object" && reportObj.exerciseId.title) {
            // Já está populado, manter
          } else {
            // Se for só o ID, popular
            const exercise = await Exercise.findById(reportObj.exerciseId).select("title");
            if (exercise) {
              reportObj.exerciseId = {
                _id: reportObj.exerciseId,
                title: exercise.title,
              };
            }
          }
        } else if (report.targetType === "ANSWER") {
          const answer = await Answer.findById(report.targetId)
            .populate("author", "username")
            .select("content exercise");
          if (answer) {
            reportObj.target = {
              content: answer.content?.substring(0, 150) + (answer.content?.length > 150 ? "..." : ""),
              author: answer.author?.username || "Anónimo",
            };
            // Se não tiver exerciseId populado, usar o do answer
            if (!reportObj.exerciseId && answer.exercise) {
              const exercise = await Exercise.findById(answer.exercise).select("title");
              if (exercise) {
                reportObj.exerciseId = {
                  _id: answer.exercise,
                  title: exercise.title,
                };
              }
            } else if (reportObj.exerciseId && typeof reportObj.exerciseId === "object" && !reportObj.exerciseId.title) {
              // Se for objeto mas sem title, popular
              const exercise = await Exercise.findById(reportObj.exerciseId._id || reportObj.exerciseId).select("title");
              if (exercise) {
                reportObj.exerciseId = {
                  _id: reportObj.exerciseId._id || reportObj.exerciseId,
                  title: exercise.title,
                };
              }
            }
          }
        }
        
        return reportObj;
      })
    );

    res.json(reportsWithTarget);
  } catch (error) {
    console.error("Erro ao obter reports:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.updateReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status && !["PENDENTE", "RESOLVIDO"].includes(status)) {
      return res.status(400).json({ message: "Estado inválido." });
    }

    const report = await Report.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate("reporter", "username email");

    if (!report) {
      return res.status(404).json({ message: "Report não encontrado." });
    }

    res.json(report);
  } catch (error) {
    console.error("Erro ao atualizar report:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.deleteReport = async (req, res) => {
  try {
    const { id } = req.params;

    const report = await Report.findById(id);
    if (!report) {
      return res.status(404).json({ message: "Report não encontrado." });
    }

    await Report.findByIdAndDelete(id);
    res.json({ message: "Report removido com sucesso." });
  } catch (error) {
    console.error("Erro ao remover report:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// ===============================
// USERS / ROLES
// ===============================

exports.getUsers = async (req, res) => {
  try {
    const { search } = req.query;
    
    const filter = {};
    if (search) {
      filter.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const users = await User.find(filter)
      .select("username email role createdAt")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    console.error("Erro ao obter utilizadores:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    // Apenas ALUNO e ADMIN são permitidos
    const normalizedRole = role.toUpperCase();
    
    if (!["ALUNO", "ADMIN"].includes(normalizedRole)) {
      return res.status(400).json({ message: "Role inválida. Apenas ALUNO e ADMIN são permitidos." });
    }

    const user = await User.findByIdAndUpdate(
      id,
      { role: normalizedRole },
      { new: true, runValidators: true }
    ).select("username email role createdAt");

    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado." });
    }

    res.json(user);
  } catch (error) {
    console.error("Erro ao atualizar role:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

// ===============================
// DELETE CONTENT (ADMIN)
// ===============================

exports.deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercício não encontrado." });
    }

    // Remover respostas relacionadas
    await Answer.deleteMany({ exercise: id });

    // Remover exercício
    await Exercise.findByIdAndDelete(id);

    res.json({ message: "Exercício eliminado com sucesso." });
  } catch (error) {
    console.error("Erro ao eliminar exercício:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

exports.deleteAnswer = async (req, res) => {
  try {
    const { id } = req.params;

    const answer = await Answer.findById(id);
    if (!answer) {
      return res.status(404).json({ message: "Comentário não encontrado." });
    }

    await Answer.findByIdAndDelete(id);

    res.json({ message: "Comentário eliminado com sucesso." });
  } catch (error) {
    console.error("Erro ao eliminar comentário:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

