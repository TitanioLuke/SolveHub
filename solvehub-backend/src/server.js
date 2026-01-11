require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("./models/User");

const app = require("./app");

const PORT = process.env.PORT || 5050;

// Criar servidor HTTP
const server = http.createServer(app);

// Configurar Socket.IO com CORS dinâmico
const allowedSocketOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
  : [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3000",
      "http://localhost:5173", // Vite default
      "http://localhost:8080"
    ];

const io = new Server(server, {
  cors: {
    origin: allowedSocketOrigins,
    credentials: true,
  },
});

// Middleware de autenticação para Socket.IO
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return next(new Error("Token não fornecido"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return next(new Error("Utilizador não encontrado"));
    }

    socket.userId = user._id.toString();
    next();
  } catch (error) {
    next(new Error("Token inválido"));
  }
});

// Conexão Socket.IO
io.on("connection", (socket) => {
  console.log(`Utilizador conectado: ${socket.userId}`);

  // Associar utilizador a uma room
  socket.join(`user:${socket.userId}`);

  // Evento para juntar-se a uma room de exercício
  socket.on("joinExercise", (data) => {
    const { exerciseId } = data;
    if (exerciseId) {
      socket.join(`exercise:${exerciseId}`);
      console.log(`Utilizador ${socket.userId} juntou-se ao exercício ${exerciseId}`);
    }
  });

  // Evento para sair de uma room de exercício
  socket.on("leaveExercise", (data) => {
    const { exerciseId } = data;
    if (exerciseId) {
      socket.leave(`exercise:${exerciseId}`);
      console.log(`Utilizador ${socket.userId} saiu do exercício ${exerciseId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`Utilizador desconectado: ${socket.userId}`);
  });
});

// Tornar io disponível globalmente
app.set("io", io);

server.listen(PORT, "0.0.0.0", () => {
  console.log("🚀 Servidor a correr na porta", PORT);
  console.log("📡 WebSocket ativo");
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || "development"}`);
});
