const mongoose = require("mongoose");

const ExerciseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "O título é obrigatório"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "A descrição é obrigatória"],
    },

    // Manter subject (string) para compatibilidade durante migração
    subject: {
      type: String,
      trim: true,
    },
    // Nova referência ao Subject
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subject",
    },

    tags: [
      {
        type: String,
        trim: true,
      }
    ],
    attachments: [
      {
        url: { type: String, required: true },
        publicId: { type: String, default: null }, // null para anexos antigos locais
        type: { type: String, enum: ['image', 'pdf'], required: true },
        filename: { type: String, required: true },
        size: { type: Number, default: null }, // tamanho em bytes
        createdAt: { type: Date, default: Date.now }
      }
    ],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    dislikes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    answersCount: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exercise", ExerciseSchema);
