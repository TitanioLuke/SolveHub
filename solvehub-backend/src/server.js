require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// conectar ao MongoDB
connectDB();

// iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr na porta ${PORT}`);
});
