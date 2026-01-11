const Notification = require("../models/Notification");
const User = require("../models/User");

/**
 * Cria uma notificação e emite via socket (com verificação de preferências)
 * @param {Object} io - Instância do Socket.IO
 * @param {String} userId - ID do destinatário
 * @param {String} type - Tipo: 'comment', 'reply', 'like', 'exercise_like'
 * @param {String} message - Mensagem da notificação
 * @param {String} link - Link para navegar (ex: '/exercise.html?id=...')
 * @param {String} relatedExerciseId - ID do exercício relacionado (opcional)
 * @param {String} relatedAnswerId - ID da resposta relacionada (opcional)
 */
async function createNotification(
  io,
  userId,
  type,
  message,
  link,
  relatedExerciseId = null,
  relatedAnswerId = null
) {
  try {
    const user = await User.findById(userId).select("notificationSettings");
    if (!user) {
      console.error("Utilizador não encontrado para notificação:", userId);
      return null;
    }

    const settings = user.notificationSettings || {
      exerciseReplies: true,
      commentReplies: true,
      exerciseLikes: false
    };

    let shouldNotify = true;

    if (type === "comment" && !settings.exerciseReplies) {
      shouldNotify = false;
    } else if (type === "reply" && !settings.commentReplies) {
      shouldNotify = false;
    } else if (type === "exercise_like" && !settings.exerciseLikes) {
      shouldNotify = false;
    }

    if (!shouldNotify) {
      return null;
    }

    const notification = new Notification({
      userId,
      type,
      message,
      link,
      relatedExercise: relatedExerciseId,
      relatedAnswer: relatedAnswerId,
    });

    await notification.save();

    if (io) {
      io.to(`user:${userId}`).emit("notification:new", notification);
    }

    return notification;
  } catch (err) {
    console.error("Erro ao criar notificação:", err);
    return null;
  }
}

module.exports = { createNotification };

