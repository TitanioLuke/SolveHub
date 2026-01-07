const User = require("../models/User");
const Exercise = require("../models/Exercise");
const Answer = require("../models/Answer");
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
      role: "ALUNO", // Todos os novos utilizadores são alunos por padrão
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

// ===============================
// CHANGE PASSWORD
// ===============================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validar campos obrigatórios
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Palavra-passe atual e nova palavra-passe são obrigatórias" });
    }

    // Validar tamanho mínimo
    if (newPassword.length < 8) {
      return res.status(400).json({ message: "A nova palavra-passe deve ter pelo menos 8 caracteres" });
    }

    // Buscar utilizador (com password para comparação)
    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    // Verificar palavra-passe atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Palavra-passe atual incorreta" });
    }

    // Verificar que a nova palavra-passe é diferente da atual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "A nova palavra-passe deve ser diferente da atual" });
    }

    // Hash da nova palavra-passe
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Atualizar palavra-passe
    user.password = newPasswordHash;
    await user.save();

    res.json({ message: "Palavra-passe atualizada com sucesso" });
  } catch (error) {
    console.error("Erro ao alterar palavra-passe:", error);
    res.status(500).json({ message: "Erro ao alterar palavra-passe" });
  }
};

// ===============================
// GET SAVED EXERCISES
// ===============================
exports.getSavedExercises = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate({
      path: "savedExercises",
      populate: {
        path: "author",
        select: "username avatar"
      }
    });

    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    // Adicionar contagem de respostas e votes para cada exercício
    const exercisesWithCounts = await Promise.all(
      user.savedExercises.map(async (ex) => {
        const answersCount = await Answer.countDocuments({ exercise: ex._id });
        const votes = (ex.likes?.length || 0) - (ex.dislikes?.length || 0);
        return {
          ...ex.toObject(),
          answersCount,
          votes
        };
      })
    );

    res.json(exercisesWithCounts);
  } catch (error) {
    console.error("Erro ao carregar exercícios guardados:", error);
    res.status(500).json({ message: "Erro ao carregar exercícios guardados" });
  }
};

// ===============================
// GET NOTIFICATION SETTINGS
// ===============================
exports.getNotificationSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("notificationSettings");
    
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    // Retornar com defaults se não existir
    const settings = user.notificationSettings || {
      exerciseReplies: true,
      commentReplies: true,
      exerciseLikes: false
    };

    res.json(settings);
  } catch (error) {
    console.error("Erro ao carregar preferências de notificações:", error);
    res.status(500).json({ message: "Erro ao carregar preferências de notificações" });
  }
};

// ===============================
// UPDATE NOTIFICATION SETTINGS
// ===============================
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { exerciseReplies, commentReplies, exerciseLikes } = req.body;

    // Validar tipos (se vier undefined, manter valor atual)
    const update = {};
    if (typeof exerciseReplies === 'boolean') {
      update['notificationSettings.exerciseReplies'] = exerciseReplies;
    }
    if (typeof commentReplies === 'boolean') {
      update['notificationSettings.commentReplies'] = commentReplies;
    }
    if (typeof exerciseLikes === 'boolean') {
      update['notificationSettings.exerciseLikes'] = exerciseLikes;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: update },
      { new: true, runValidators: true }
    ).select("notificationSettings");

    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    // Retornar com defaults se não existir
    const settings = user.notificationSettings || {
      exerciseReplies: true,
      commentReplies: true,
      exerciseLikes: false
    };

    res.json(settings);
  } catch (error) {
    console.error("Erro ao atualizar preferências de notificações:", error);
    res.status(500).json({ message: "Erro ao atualizar preferências de notificações" });
  }
};