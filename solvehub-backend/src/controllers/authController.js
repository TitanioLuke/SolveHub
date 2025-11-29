const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        const exists = await User.findOne({ email });
        if (exists) return res.status(400).json({ message: "Email já registado" });

        const hash = await bcrypt.hash(password, 10);

        await User.create({
            username,
            email,
            password: hash
        });

        res.json({ message: "Conta criada com sucesso!" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Credenciais inválidas" });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ message: "Credenciais inválidas" });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "7d"
        });

        res.json({
            message: "Login efetuado com sucesso",
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
