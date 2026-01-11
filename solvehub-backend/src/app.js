const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const app = express();

// ===============================
// CONECTAR À BASE DE DADOS
// ===============================
connectDB();

// ===============================
// MIDDLEWARES GLOBAIS
// ===============================
// Configurar CORS dinamicamente
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map(origin => origin.trim())
  : [
      "http://localhost:5500",
      "http://127.0.0.1:5500",
      "http://localhost:3000",
      "http://localhost:5173", // Vite default
      "http://localhost:8080"
    ];

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requisições sem origin (mobile apps, Postman, etc)
    if (!origin) return callback(null, true);
    
    // Em produção, verificar strictamente a lista de origens permitidas
    // Em desenvolvimento, ser mais permissivo (mas ainda verificar)
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.NODE_ENV !== "production") {
      // Em desenvolvimento, permitir localhost em qualquer porta
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// SERVIR FICHEIROS ESTÁTICOS
// ===============================
app.use(
  "/uploads",
  express.static(path.join(__dirname, "..", "uploads"))
);

// ===============================
// ROTAS
// ===============================
app.use("/auth", require("./routes/authRoutes"));
app.use("/subjects", require("./routes/subjectRoutes")); // Endpoint público para subjects
app.use("/exercises", require("./routes/exerciseRoutes"));
app.use("/answers", require("./routes/answerRoutes"));
app.use("/notifications", require("./routes/notificationRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/reports", require("./routes/reportRoutes"));

// ===============================
// TESTE
// ===============================
app.get("/", (req, res) => {
  res.send("SolveHub API ativa!");
});

module.exports = app;
