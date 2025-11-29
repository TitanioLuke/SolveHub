const jwt = require("jsonwebtoken");
const User = require("../models/User");

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    User.findById(decoded.id)
      .select("-password")
      .then(user => {
        if (!user) {
          return res.status(401).json({ message: "Utilizador não encontrado" });
        }

        req.user = user;
        next();
      });
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
}

module.exports = authMiddleware;
