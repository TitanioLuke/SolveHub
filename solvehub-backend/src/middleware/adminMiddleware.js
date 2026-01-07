const User = require("../models/User");

const adminMiddleware = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado." });
    }

    // Verificar se é ADMIN
    const isAdmin = (user.role || "").toUpperCase() === "ADMIN";
    
    if (!isAdmin) {
      return res.status(403).json({ message: "Acesso negado. Apenas administradores podem aceder a esta rota." });
    }

    next();
  } catch (error) {
    console.error("Erro no middleware de admin:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

module.exports = adminMiddleware;

