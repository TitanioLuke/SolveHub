const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const app = express();

// Conectar BD
connectDB();

// Middlewares globais
app.use(cors());
app.use(express.json());

// Rotas
const authRoutes = require("./routes/authRoutes");
const exerciseRoutes = require("./routes/exerciseRoutes");

// IMPORTANTE: auth primeiro
app.use("/auth", authRoutes);

// Depois exercícios
app.use("/exercises", exerciseRoutes);

// Fallback (opcional)
app.get("/", (req, res) => {
    res.send("SolveHub API ativa!");
});

module.exports = app;
