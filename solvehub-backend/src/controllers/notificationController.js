const Notification = require("../models/Notification");

// ==============================
// LISTAR NOTIFICAÇÕES
// ==============================
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);

    const unreadCount = await Notification.countDocuments({
      userId,
      isRead: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (err) {
    console.error("Erro getNotifications:", err);
    res.status(500).json({ message: "Erro ao carregar notificações" });
  }
};

// ==============================
// MARCAR COMO LIDA
// ==============================
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await Notification.findOne({
      _id: id,
      userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Notificação não encontrada" });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ message: "Notificação marcada como lida", notification });
  } catch (err) {
    console.error("Erro markAsRead:", err);
    res.status(500).json({ message: "Erro ao atualizar notificação" });
  }
};

// ==============================
// MARCAR TODAS COMO LIDAS
// ==============================
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user.id;

    await Notification.updateMany(
      { userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "Todas as notificações foram marcadas como lidas" });
  } catch (err) {
    console.error("Erro markAllAsRead:", err);
    res.status(500).json({ message: "Erro ao atualizar notificações" });
  }
};

