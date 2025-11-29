require("dotenv").config();
const app = require("./app");

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
    console.log(`🚀 Servidor a correr na porta ${PORT}`);
});
