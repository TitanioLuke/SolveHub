const multer = require("multer");
const path = require("path");

// Configurar multer para usar memory storage (não salvar em disco)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  // Aceitar apenas imagens e PDFs
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") {
    // Nota: file.size pode não estar disponível no memoryStorage antes do upload
    // O limite de tamanho é verificado pelo multer limits.fileSize
    cb(null, true);
  } else {
    cb(new Error("Só imagens e PDFs permitidos"), false);
  }
};

// Middleware multer configurado
const uploadAttachments = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // Máximo 5 anexos por request
  },
});

module.exports = uploadAttachments;
