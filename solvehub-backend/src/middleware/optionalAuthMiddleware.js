const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Middleware opcional: tenta extrair o usuário se houver token, mas não falha se não houver
async function optionalAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(); // Continua sem usuário
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (user) {
      req.user = user; // user completo disponível nas rotas
    }
  } catch (error) {
    // Token inválido ou expirado, continuar sem usuário
  }
  
  next();
}

module.exports = optionalAuthMiddleware;

