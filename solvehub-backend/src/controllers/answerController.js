const Answer = require("../models/Answer");
const Exercise = require("../models/Exercise");
const { createNotification } = require("../utils/notificationHelper");
const uploadAttachments = require("../middleware/uploadAttachments");
const { uploadBufferToCloudinary, deleteAttachments } = require("../utils/cloudinaryUpload");

// Middleware para tratar erros do multer
const handleMulterError = (err, req, res, next) => {
  const multer = require("multer");
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ message: "Ficheiro demasiado grande (máx 10MB)" });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({ message: "Demasiados ficheiros (máx 5)" });
    }
    return res.status(400).json({ message: err.message });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
};

// ==============================
// CRIAR RESPOSTA
// ==============================
const createAnswerHandler = async (req, res) => {
  try {
    const { content, exerciseId, parentAnswerId } = req.body;
    
    if (!content || !exerciseId) {
      return res.status(400).json({ message: "Conteúdo e ID do exercício são obrigatórios" });
    }

    // Verificar se o exercício existe
    const exercise = await Exercise.findById(exerciseId).populate('author', '_id username');
    if (!exercise) {
      return res.status(404).json({ message: "Exercício não encontrado" });
    }

    // Se for resposta a outra resposta, verificar se existe
    let parentAnswer = null;
    if (parentAnswerId) {
      parentAnswer = await Answer.findById(parentAnswerId).populate('author', '_id');
      if (!parentAnswer) {
        return res.status(404).json({ message: "Resposta pai não encontrada" });
      }
      // Garantir que a resposta pai pertence ao mesmo exercício
      if (parentAnswer.exercise.toString() !== exerciseId) {
        return res.status(400).json({ message: "A resposta pai deve pertencer ao mesmo exercício" });
      }
    }

    // Processar ficheiros carregados - upload para Cloudinary
    const attachments = [];
    if (req.files && req.files.length > 0) {
      console.log(`📤 Processando ${req.files.length} ficheiro(s) para Cloudinary (resposta)...`);
      try {
        for (const file of req.files) {
          console.log(`  → Fazendo upload: ${file.originalname} (${file.mimetype}, ${file.size} bytes)`);
          
          if (!file.buffer) {
            console.error(`  ✗ Erro: Buffer vazio para ${file.originalname}`);
            continue;
          }

          const uploadResult = await uploadBufferToCloudinary(file.buffer, {
            filename: file.originalname,
          });

          console.log(`  ✓ Upload concluído: ${uploadResult.url}`);

          // Inferir type
          const type = file.mimetype.startsWith("image/") ? "image" : "pdf";

          attachments.push({
            url: uploadResult.url, // URL completo do Cloudinary
            publicId: uploadResult.publicId,
            type: type,
            filename: uploadResult.originalFilename,
            size: uploadResult.bytes,
            createdAt: new Date(),
          });
        }
        console.log(`✓ Total de ${attachments.length} anexo(s) processado(s)`);
      } catch (uploadError) {
        console.error("❌ Erro ao fazer upload para Cloudinary:", uploadError);
        console.error("   Detalhes:", uploadError.message, uploadError.stack);
        return res.status(500).json({
          message: `Erro ao fazer upload dos anexos: ${uploadError.message || "Erro desconhecido"}`,
        });
      }
    }

    const answer = new Answer({
      content,
      exercise: exerciseId,
      parentAnswer: parentAnswerId || null,
      author: req.user.id,
      attachments
    });

    await answer.save();

    // Se for resposta principal (não é reply), incrementar contador do exercício
    if (!parentAnswerId) {
      await Exercise.updateOne(
        { _id: exerciseId },
        { $inc: { answersCount: 1 } }
      );
    }

    // Popular author para retornar
    await answer.populate('author', 'username avatar');

    // Criar notificações
    const io = req.app.get("io");
    if (io) {
      // Se for resposta principal (comentário no exercício)
      if (!parentAnswerId) {
        const exerciseAuthorId = exercise.author._id ? exercise.author._id.toString() : exercise.author.toString();
        if (exerciseAuthorId !== req.user.id.toString()) {
          await createNotification(
            io,
            exerciseAuthorId,
            "comment",
            `${req.user.username || "Alguém"} comentou no teu exercício "${exercise.title}"`,
            `exercise.html?id=${exerciseId}`,
            exerciseId,
            answer._id
          );
        }
      }
      // Se for reply (resposta a outro comentário)
      else if (parentAnswerId && parentAnswer.author) {
        const parentAuthorId = parentAnswer.author._id ? parentAnswer.author._id.toString() : parentAnswer.author.toString();
        if (parentAuthorId !== req.user.id.toString()) {
          await createNotification(
            io,
            parentAuthorId,
            "reply",
            `${req.user.username || "Alguém"} respondeu ao teu comentário`,
            `exercise.html?id=${exerciseId}`,
            exerciseId,
            answer._id
          );
        }
      }
      
      // Emitir evento para atualizar comentários em tempo real
      io.to(`exercise:${exerciseId}`).emit("comment:created", { exerciseId });
    }

    res.status(201).json(answer);
  } catch (err) {
    console.error('Erro createAnswer:', err);
    res.status(400).json({ message: err.message });
  }
};

exports.createAnswer = [
  uploadAttachments.array("attachments", 5),
  handleMulterError,
  createAnswerHandler,
];

// ==============================
// LISTAR RESPOSTAS DE UM EXERCÍCIO
// ==============================
exports.getAnswersByExercise = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    const userId = req.user?.id || null;
    
    // Buscar todas as respostas do exercício (incluindo aninhadas)
    const allAnswers = await Answer.find({ exercise: exerciseId })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });

    // Separar respostas principais (sem parent) e respostas aninhadas
    const mainAnswers = allAnswers.filter(a => !a.parentAnswer);
    const nestedAnswers = allAnswers.filter(a => a.parentAnswer);

    // Organizar respostas aninhadas por parentAnswer
    const answersMap = new Map();
    mainAnswers.forEach(answer => {
      const answerObj = answer.toObject();
      const likesCount = answer.likes ? answer.likes.length : 0;
      const dislikesCount = answer.dislikes ? answer.dislikes.length : 0;
      const hasLiked = userId && answer.likes ? answer.likes.some(id => id.toString() === userId.toString()) : false;
      const hasDisliked = userId && answer.dislikes ? answer.dislikes.some(id => id.toString() === userId.toString()) : false;
      
      answersMap.set(answer._id.toString(), {
        ...answerObj,
        likesCount,
        dislikesCount,
        hasLiked,
        hasDisliked,
        replies: []
      });
    });

    // Adicionar respostas aninhadas aos seus pais
    nestedAnswers.forEach(reply => {
      const replyObj = reply.toObject();
      const likesCount = reply.likes ? reply.likes.length : 0;
      const dislikesCount = reply.dislikes ? reply.dislikes.length : 0;
      const hasLiked = userId && reply.likes ? reply.likes.some(id => id.toString() === userId.toString()) : false;
      const hasDisliked = userId && reply.dislikes ? reply.dislikes.some(id => id.toString() === userId.toString()) : false;
      
      const parentId = reply.parentAnswer.toString();
      if (answersMap.has(parentId)) {
        answersMap.get(parentId).replies.push({
          ...replyObj,
          likesCount,
          dislikesCount,
          hasLiked,
          hasDisliked
        });
      }
    });

    // Converter map para array e ordenar replies por data
    const result = Array.from(answersMap.values()).map(answer => ({
      ...answer,
      replies: answer.replies.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    }));

    res.json(result);
  } catch (err) {
    console.error('Erro getAnswersByExercise:', err);
    res.status(500).json({ message: "Erro ao carregar respostas" });
  }
};

// ==============================
// LIKE/DISLIKE RESPOSTA
// ==============================
exports.toggleLike = async (req, res) => {
  try {
    const { answerId } = req.params;
    const userId = req.user.id;

    const answer = await Answer.findById(answerId);
    if (!answer) {
      return res.status(404).json({ message: "Resposta não encontrada" });
    }

    const hasLiked = answer.likes.includes(userId);
    const hasDisliked = answer.dislikes.includes(userId);

    if (hasLiked) {
      // Remover like
      answer.likes = answer.likes.filter(id => id.toString() !== userId.toString());
    } else {
      // Adicionar like e remover dislike se existir
      answer.likes.push(userId);
      answer.dislikes = answer.dislikes.filter(id => id.toString() !== userId.toString());
    }

    await answer.save();
    await answer.populate('author', 'username avatar');

    // Retornar com contadores em vez de populate
    const answerObj = answer.toObject();
    answerObj.likesCount = answer.likes.length;
    answerObj.dislikesCount = answer.dislikes.length;
    answerObj.hasLiked = answer.likes.some(id => id.toString() === userId.toString());
    answerObj.hasDisliked = answer.dislikes.some(id => id.toString() === userId.toString());

    // Emitir evento para atualizar votos em tempo real
    const io = req.app.get("io");
    if (io && answer.exercise) {
      const exerciseId = answer.exercise.toString();
      io.to(`exercise:${exerciseId}`).emit("comment:votesUpdated", { 
        exerciseId, 
        commentId: answerId 
      });
    }

    res.json(answerObj);
  } catch (err) {
    console.error('Erro toggleLike:', err);
    res.status(500).json({ message: "Erro ao atualizar like" });
  }
};

exports.toggleDislike = async (req, res) => {
  try {
    const { answerId } = req.params;
    const userId = req.user.id;

    const answer = await Answer.findById(answerId);
    if (!answer) {
      return res.status(404).json({ message: "Resposta não encontrada" });
    }

    const hasLiked = answer.likes.includes(userId);
    const hasDisliked = answer.dislikes.includes(userId);

    if (hasDisliked) {
      // Remover dislike
      answer.dislikes = answer.dislikes.filter(id => id.toString() !== userId.toString());
    } else {
      // Adicionar dislike e remover like se existir
      answer.dislikes.push(userId);
      answer.likes = answer.likes.filter(id => id.toString() !== userId.toString());
    }

    await answer.save();
    await answer.populate('author', 'username avatar');

    // Retornar com contadores em vez de populate
    const answerObj = answer.toObject();
    answerObj.likesCount = answer.likes.length;
    answerObj.dislikesCount = answer.dislikes.length;
    answerObj.hasLiked = answer.likes.some(id => id.toString() === userId.toString());
    answerObj.hasDisliked = answer.dislikes.some(id => id.toString() === userId.toString());

    // Emitir evento para atualizar votos em tempo real
    const io = req.app.get("io");
    if (io && answer.exercise) {
      const exerciseId = answer.exercise.toString();
      io.to(`exercise:${exerciseId}`).emit("comment:votesUpdated", { 
        exerciseId, 
        commentId: answerId 
      });
    }

    res.json(answerObj);
  } catch (err) {
    console.error('Erro toggleDislike:', err);
    res.status(500).json({ message: "Erro ao atualizar dislike" });
  }
};

// ==============================
// CONTAR RESPOSTAS DE UM EXERCÍCIO (para o card)
// ==============================
exports.getAnswersCount = async (req, res) => {
  try {
    const { exerciseId } = req.params;
    
    const exercise = await Exercise.findById(exerciseId);
    if (!exercise) {
      return res.status(404).json({ message: "Exercício não encontrado" });
    }

    // Usar o contador do exercício (mais performático)
    const answersCount = exercise.answersCount || 0;

    res.json({ answersCount });
  } catch (err) {
    console.error('Erro getAnswersCount:', err);
    res.status(500).json({ message: "Erro ao carregar contador de respostas" });
  }
};

