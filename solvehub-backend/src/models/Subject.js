const mongoose = require("mongoose");

const SubjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O nome da disciplina é obrigatório"],
      trim: true,
      unique: true,
      maxlength: [80, "O nome não pode ter mais de 80 caracteres"],
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Gerar slug automaticamente antes de salvar
SubjectSchema.pre("save", async function() {
  if (this.isModified("name") && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove acentos
      .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
      .replace(/\s+/g, "-") // Substitui espaços por hífens
      .replace(/-+/g, "-") // Remove hífens duplicados
      .trim();
  }
});

// Índice único em name (já está no schema acima)
// Índice em slug para buscas rápidas
SubjectSchema.index({ slug: 1 });

module.exports = mongoose.model("Subject", SubjectSchema);

