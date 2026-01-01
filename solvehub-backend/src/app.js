const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const connectDB = require("./config/db");

const app = express();

// ===============================
// CONECTAR À BASE DE DADOS
// ===============================
connectDB();

// ===============================
// MIDDLEWARES GLOBAIS
// ===============================
app.use(cors({
  origin: [
    "http://localhost:5500/",
    "http://127.0.0.1:5500/",
    "http://localhost:3000/"
  ],
  credentials: true
}));

app.use(express.json());

// ===============================
// SERVIR FICHEIROS ESTÁTICOS (UPLOADS / AVATARES)
// ===============================
// Usa static por defeito (mais simples e eficiente)
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// ===============================
// ROTAS
// ===============================
const authRoutes = require("./routes/authRoutes");
const exerciseRoutes = require("./routes/exerciseRoutes");

app.use("/auth", authRoutes);
app.use("/exercises", exerciseRoutes);

// ===============================
// FALLBACK
// ===============================
app.get("/", (req, res) => {
  res.send("SolveHub API ativa!");
});

module.exports = app;