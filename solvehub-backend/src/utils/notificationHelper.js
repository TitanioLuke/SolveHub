const Notification = require("../models/Notification");

/**
 * Cria uma notificação e emite via socket
 * @param {Object} io - Instância do Socket.IO
 * @param {String} userId - ID do destinatário
 * @param {String} type - Tipo: 'comment', 'reply', 'like'
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
    const notification = new Notification({
      userId,
      type,
      message,
      link,
      relatedExercise: relatedExerciseId,
      relatedAnswer: relatedAnswerId,
    });

    await notification.save();

    // Emitir via socket para o utilizador específico
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

