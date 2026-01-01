const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// ===============================
// REGISTER
// ===============================
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: "Email já está registado." });
    }

    const hash = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hash,
    });

    await newUser.save();
    res.json({ message: "Conta criada com sucesso!" });
  } catch {
    res.status(500).json({ message: "Erro ao criar conta" });
  }
};

// ===============================
// LOGIN
// ===============================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Credenciais inválidas." });
    if (!user.isActive) return res.status(403).json({ message: "Conta desativada." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Credenciais inválidas." });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    user.lastLogin = new Date();
    await user.save();

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
      },
    });
  } catch {
    res.status(500).json({ message: "Erro ao iniciar sessão" });
  }
};

// ===============================
// GET USER LOGADO
// ===============================
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json(user);
  } catch {
    res.status(500).json({ message: "Erro ao carregar utilizador" });
  }
};

// ===============================
// UPDATE PERFIL
// ===============================
exports.updateMe = async (req, res) => {
  try {
    const { username, email, bio } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { username, email, bio },
      { new: true, runValidators: true }
    ).select("-password");

    res.json(user);
  } catch {
    res.status(500).json({ message: "Erro ao atualizar perfil" });
  }
};

// ===============================
// UPLOAD AVATAR
// ===============================
exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhuma imagem enviada" });
    }

    const avatarPath = `/uploads/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: avatarPath },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch {
    res.status(500).json({ message: "Erro ao atualizar avatar" });
  }
};
