const Exercise = require("../models/Exercise");
const Answer = require("../models/Answer");
const User = require("../models/User");
const Subject = require("../models/Subject");
const { createNotification } = require("../utils/notificationHelper");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==============================
// MULTER CONFIG (UPLOAD FOTOS)
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    // SEPARA por tipo de ficheiro
    if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(__dirname, '../../uploads/exercises/images');
    } else {
      uploadPath = path.join(__dirname, '../../uploads/exercises/pdfs');
    }
    
    // Cria pasta se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    if (file.size > 20 * 1024 * 1024) { // 20MB
      return cb(new Error('Ficheiro demasiado grande (máx 20MB)'), false);
    }
    cb(null, true);
  } else {
    cb(new Error('Só imagens e PDFs permitidos'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB máx
});

exports.createExercise = [
  upload.array('attachments', 10), // máx 10 ficheiros
  async (req, res) => {
    try {
      const { title, description, subject, subjectId, tags } = req.body;
      
      // Validar subjectId se fornecido
      let finalSubjectId = null;
      let finalSubject = null;
      
      if (subjectId) {
        const subjectDoc = await Subject.findById(subjectId);
        if (!subjectDoc) {
          return res.status(400).json({ message: "Disciplina não encontrada." });
        }
        finalSubjectId = subjectId;
        finalSubject = subjectDoc.name; // Manter compatibilidade
      } else if (subject) {
        // Se subjectId não fornecido mas subject (string) sim, tentar encontrar
        const subjectDoc = await Subject.findOne({ name: subject });
        if (subjectDoc) {
          finalSubjectId = subjectDoc._id;
          finalSubject = subjectDoc.name;
        } else {
          // Se não encontrar, usar string (compatibilidade durante migração)
          finalSubject = subject;
        }
      } else {
        return res.status(400).json({ message: "Disciplina é obrigatória." });
      }
      
      // Processar ficheiros carregados
      const attachments = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          const folder = file.mimetype.startsWith('image/') ? 'images' : 'pdfs';
            attachments.push({
              url: `/uploads/exercises/${folder}/${file.filename}`,
              type: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
              filename: file.originalname
            });

        });
      } 

      const exercise = new Exercise({
        title,
        description,
        subject: finalSubject,
        subjectId: finalSubjectId,
        tags: tags ? JSON.parse(tags) : [],
        attachments,
        author: req.user.id
      });

      await exercise.save();
      
      // Popular subject antes de retornar
      await exercise.populate("subjectId", "name slug");
      
      res.status(201).json(exercise);
      
    } catch (err) {
      console.error('Erro createExercise:', err);
      res.status(400).json({ message: err.message });
    }
  }
];

exports.getExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find()
      .populate("author", "username avatar")
      .populate("subjectId", "name slug")
      .populate("likes", "_id")
      .populate("dislikes", "_id")
      .sort({ createdAt: -1 });

    // Adicionar contagem de respostas
    const exercisesWithCounts = await Promise.all(
      exercises.map(async (ex) => {
        const answersCount = await Answer.countDocuments({ exercise: ex._id });
        const votes = (ex.likes?.length || 0) - (ex.dislikes?.length || 0);
        return {
          ...ex.toObject(),
          answersCount,
          votes
        };
      })
    );

    res.json(exercisesWithCounts);
  } catch (err) {
    res.status(500).json({ message: "Erro ao carregar exercícios" });
  }
};

exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id)
      .populate("author", "username avatar")
      .populate("subjectId", "name slug")
      .populate("likes", "username")
      .populate("dislikes", "username");

    if (!exercise) return res.status(404).json({ message: "Exercício não encontrado" });
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar exercício", error: err });
  }
};

// ==============================
// LIKE/DISLIKE EXERCISE
// ==============================
exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercício não encontrado" });
    }

    const hasLiked = exercise.likes.some(likeId => likeId.toString() === userId.toString());
    const hasDisliked = exercise.dislikes.some(dislikeId => dislikeId.toString() === userId.toString());

    const wasLiked = hasLiked;
    
    if (hasLiked) {
      // Remover like
      exercise.likes = exercise.likes.filter(id => id.toString() !== userId.toString());
    } else {
      // Adicionar like e remover dislike se existir
      exercise.likes.push(userId);
      exercise.dislikes = exercise.dislikes.filter(id => id.toString() !== userId.toString());
    }

    // Usar updateOne para não atualizar o campo updatedAt automaticamente
    await Exercise.updateOne(
      { _id: exercise._id },
      { 
        $set: { 
          likes: exercise.likes,
          dislikes: exercise.dislikes
        }
      }
    );
    
    // Buscar o exercício atualizado sem alterar updatedAt
    const updatedExercise = await Exercise.findById(exercise._id)
      .populate("author", "username avatar")
      .populate("likes", "username")
      .populate("dislikes", "username");

    // Criar notificação de like apenas quando o like é adicionado (não removido)
    // e apenas se o autor do exercício for diferente do usuário que deu like
    if (!wasLiked && updatedExercise.author) {
      const exerciseAuthorId = updatedExercise.author._id 
        ? updatedExercise.author._id.toString() 
        : updatedExercise.author.toString();
      const likerId = userId.toString();

      // Só notificar se não for o próprio autor
      if (exerciseAuthorId !== likerId) {
        const likerUsername = req.user?.username || "Alguém";
        
        const io = req.app.get("io");
        if (io) {
          await createNotification(
            io,
            exerciseAuthorId,
            "exercise_like",
            `${likerUsername} gostou do teu exercício "${exercise.title}"`,
            `exercise.html?id=${exercise._id}`,
            exercise._id,
            null
          );
        }
      }
    }

    res.json(updatedExercise);
  } catch (err) {
    console.error('Erro toggleLike:', err);
    res.status(500).json({ message: "Erro ao atualizar like" });
  }
};

exports.toggleDislike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercício não encontrado" });
    }

    const hasLiked = exercise.likes.some(likeId => likeId.toString() === userId.toString());
    const hasDisliked = exercise.dislikes.some(dislikeId => dislikeId.toString() === userId.toString());

    if (hasDisliked) {
      // Remover dislike
      exercise.dislikes = exercise.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      // Adicionar dislike e remover like se existir
      exercise.dislikes.push(userId);
      exercise.likes = exercise.likes.filter(id => id.toString() !== userId.toString());
    }

    // Usar updateOne para não atualizar o campo updatedAt automaticamente
    await Exercise.updateOne(
      { _id: exercise._id },
      { 
        $set: { 
          likes: exercise.likes,
          dislikes: exercise.dislikes
        }
      }
    );
    
    // Buscar o exercício atualizado sem alterar updatedAt
    const updatedExercise = await Exercise.findById(exercise._id)
      .populate("author", "username avatar")
      .populate("likes", "username")
      .populate("dislikes", "username");

    res.json(updatedExercise);
  } catch (err) {
    console.error('Erro toggleDislike:', err);
    res.status(500).json({ message: "Erro ao atualizar dislike" });
  }
};

// ==============================
// ATUALIZAR EXERCÍCIO
// ==============================
exports.updateExercise = [
  upload.array('attachments', 10),
  async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const { title, description, subject, subjectId, tags } = req.body;

      const exercise = await Exercise.findById(id);
      if (!exercise) {
        return res.status(404).json({ message: "Exercício não encontrado" });
      }

      // Verificar se o utilizador é o autor
      if (exercise.author.toString() !== userId.toString()) {
        return res.status(403).json({ message: "Não tens permissão para editar este exercício" });
      }

      // Atualizar campos
      if (title) exercise.title = title;
      if (description) exercise.description = description;
      
      // Atualizar subjectId se fornecido
      if (subjectId) {
        const subjectDoc = await Subject.findById(subjectId);
        if (!subjectDoc) {
          return res.status(400).json({ message: "Disciplina não encontrada." });
        }
        exercise.subjectId = subjectId;
        exercise.subject = subjectDoc.name; // Manter compatibilidade
      } else if (subject) {
        // Se subjectId não fornecido mas subject (string) sim, tentar encontrar
        const subjectDoc = await Subject.findOne({ name: subject });
        if (subjectDoc) {
          exercise.subjectId = subjectDoc._id;
          exercise.subject = subjectDoc.name;
        } else {
          exercise.subject = subject;
        }
      }
      
      if (tags) exercise.tags = JSON.parse(tags);

      // Remover anexos se especificado
      let removedAttachments = [];
      if (req.body.removedAttachments) {
        try {
          removedAttachments = JSON.parse(req.body.removedAttachments);
        } catch (e) {
          console.error("Erro ao parsear removedAttachments:", e);
        }
      }

      // Filtrar anexos removidos
      if (removedAttachments.length > 0) {
        exercise.attachments = (exercise.attachments || []).filter(
          att => !removedAttachments.includes(att.url)
        );
      }

      // Processar novos ficheiros se houver
      if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map(file => {
          const folder = file.mimetype.startsWith('image/') ? 'images' : 'pdfs';
          return {
            url: `/uploads/exercises/${folder}/${file.filename}`,
            type: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
            filename: file.originalname
          };
        });
        
        // Adicionar aos anexos existentes
        exercise.attachments = [...(exercise.attachments || []), ...newAttachments];
      }

      await exercise.save();
      
      // Popular campos para retornar
      await exercise.populate("author", "username avatar");
      await exercise.populate("subjectId", "name slug");
      await exercise.populate("likes", "username");
      await exercise.populate("dislikes", "username");

      res.json(exercise);
    } catch (err) {
      console.error('Erro updateExercise:', err);
      res.status(400).json({ message: err.message || "Erro ao atualizar exercício" });
    }
  }
];

// ==============================
// APAGAR EXERCÍCIO
// ==============================
exports.deleteExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercício não encontrado" });
    }

    // Verificar se o utilizador é o autor
    if (exercise.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Não tens permissão para apagar este exercício" });
    }

    // Apagar respostas associadas
    await Answer.deleteMany({ exercise: id });

    // Apagar ficheiros físicos (opcional - pode ser feito em background)
    // Por agora, apenas apagar o documento

    await Exercise.findByIdAndDelete(id);

    res.status(204).send();
  } catch (err) {
    console.error('Erro deleteExercise:', err);
    res.status(500).json({ message: "Erro ao apagar exercício" });
  }
};

// ==============================
// SAVE/UNSAVE EXERCISE
// ==============================
exports.saveExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const exercise = await Exercise.findById(id);
    if (!exercise) {
      return res.status(404).json({ message: "Exercício não encontrado" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    // Verificar se já está guardado
    const isAlreadySaved = user.savedExercises.some(
      savedId => savedId.toString() === id
    );

    if (isAlreadySaved) {
      return res.status(400).json({ message: "Exercício já está guardado" });
    }

    // Adicionar aos guardados usando $addToSet para garantir que não há duplicados
    await User.findByIdAndUpdate(
      userId,
      { $addToSet: { savedExercises: id } },
      { new: true }
    );

    res.json({ message: "Exercício guardado com sucesso" });
  } catch (err) {
    console.error('Erro saveExercise:', err);
    res.status(500).json({ message: "Erro ao guardar exercício" });
  }
};

exports.unsaveExercise = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    // Remover dos guardados
    user.savedExercises = user.savedExercises.filter(
      savedId => savedId.toString() !== id
    );
    await user.save();

    res.json({ message: "Exercício removido dos guardados" });
  } catch (err) {
    console.error('Erro unsaveExercise:', err);
    res.status(500).json({ message: "Erro ao remover exercício dos guardados" });
  }
};
