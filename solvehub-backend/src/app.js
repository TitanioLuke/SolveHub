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
app.use(cors());
app.use(express.json());

// ===============================
// SERVIR FICHEIROS ESTÁTICOS (AVATARES)
// ===============================
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===============================
// ROTAS
// ===============================
const authRoutes = require("./routes/authRoutes");
const exerciseRoutes = require("./routes/exerciseRoutes");

// IMPORTANTE: auth primeiro
app.use("/auth", authRoutes);

// Depois exercícios
app.use("/exercises", exerciseRoutes);

// ===============================
// FALLBACK
// ===============================
app.get("/", (req, res) => {
    res.send("SolveHub API ativa!");
});

module.exports = app;
