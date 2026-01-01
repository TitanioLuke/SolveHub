const Exercise = require("../models/Exercise");
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ==============================
// MULTER CONFIG (UPLOAD FOTOS)
// ==============================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    // SEPARA por tipo de ficheiro
    if (file.mimetype.startsWith('image/')) {
      uploadPath = path.join(__dirname, '../../uploads/exercises/images');
    } else {
      uploadPath = path.join(__dirname, '../../uploads/exercises/pdfs');
    }
    
    // Cria pasta se não existir
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    if (file.size > 20 * 1024 * 1024) { // 20MB
      return cb(new Error('Ficheiro demasiado grande (máx 20MB)'), false);
    }
    cb(null, true);
  } else {
    cb(new Error('Só imagens e PDFs permitidos'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB máx
});

exports.createExercise = [
  upload.array('attachments', 10), // máx 10 ficheiros
  async (req, res) => {
    try {
      const { title, description, subject, tags } = req.body;
      
      // Processar ficheiros carregados
      const attachments = [];
      if (req.files && req.files.length > 0) {
        req.files.forEach(file => {
          const folder = file.mimetype.startsWith('image/') ? 'images' : 'pdfs';
            attachments.push({
              url: `/uploads/exercises/${folder}/${file.filename}`,  // ✅ CORRETO
              type: file.mimetype.startsWith('image/') ? 'image' : 'pdf',
              filename: file.originalname
            });

        });
      } 

      const exercise = new Exercise({
        title,
        description,
        subject,
        tags: tags ? JSON.parse(tags) : [],
        attachments,
        author: req.user.id
      });

      await exercise.save();
      res.status(201).json(exercise);
      
    } catch (err) {
      console.error('Erro createExercise:', err);
      res.status(400).json({ message: err.message });
    }
  }
];

exports.getExercises = async (req, res) => {
  try {
    const exercises = await Exercise.find()
      .populate("author", "username")
      .sort({ createdAt: -1 });

    res.json(exercises);
  } catch (err) {
    res.status(500).json({ message: "Erro ao carregar exercícios" });
  }
};

exports.getExerciseById = async (req, res) => {
  try {
    const exercise = await Exercise.findById(req.params.id)
      .populate("author", "username");

    if (!exercise) return res.status(404).json({ message: "Exercício não encontrado" });
    res.json(exercise);
  } catch (err) {
    res.status(500).json({ message: "Erro ao buscar exercício", error: err });
  }
};
