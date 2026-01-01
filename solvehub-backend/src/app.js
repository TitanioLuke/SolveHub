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
app.use(cors({
  origin: [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:3000"
  ],
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
app.use("/exercises", require("./routes/exerciseRoutes"));

// ===============================
// TESTE
// ===============================
app.get("/", (req, res) => {
  res.send("SolveHub API ativa!");
});

module.exports = app;
