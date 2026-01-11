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
const { uploadBufferToCloudinary, deleteAttachment } = require("../utils/cloudinaryUpload");

exports.uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Nenhuma imagem enviada" });
    }

    const currentUser = await User.findById(req.user.id);
    
    console.log(`📤 Fazendo upload de avatar para Cloudinary: ${req.file.originalname}`);
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, {
      filename: `avatar-${req.user.id}`,
      folder: `${process.env.CLOUDINARY_FOLDER || "solvehub"}/avatars`,
    });

    console.log(`✓ Avatar carregado: ${uploadResult.url}`);

    if (currentUser.avatar) {
      if (currentUser.avatar.startsWith("https://res.cloudinary.com") || currentUser.avatar.includes("cloudinary.com")) {
        try {
          const url = currentUser.avatar;
          const uploadIndex = url.indexOf("/upload/");
          if (uploadIndex !== -1) {
            const afterUpload = url.substring(uploadIndex + "/upload/".length);
            const publicIdWithExt = afterUpload.split("?")[0].split("#")[0];
            const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
            await deleteAttachment({ publicId, url: currentUser.avatar });
            console.log(`✓ Avatar antigo removido do Cloudinary (${publicId})`);
          }
        } catch (deleteError) {
          console.error("Erro ao apagar avatar antigo do Cloudinary:", deleteError);
        }
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { avatar: uploadResult.url },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    console.error("Erro ao atualizar avatar:", error);
    res.status(500).json({ message: `Erro ao atualizar avatar: ${error.message || "Erro desconhecido"}` });
  }
};

// ===============================
// CHANGE PASSWORD
// ===============================
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Palavra-passe atual e nova palavra-passe são obrigatórias" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: "A nova palavra-passe deve ter pelo menos 8 caracteres" });
    }

    const userId = req.user._id || req.user.id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Utilizador não encontrado" });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ message: "Palavra-passe atual incorreta" });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "A nova palavra-passe deve ser diferente da atual" });
    }

    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
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