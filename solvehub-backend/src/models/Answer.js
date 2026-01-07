const mongoose = require("mongoose");

const AnswerSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, "O conteúdo da resposta é obrigatório"],
    },
    exercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    parentAnswer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Answer",
      default: null, // null = resposta direta ao exercício, não null = resposta a outra resposta
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    ]
  },
  { timestamps: true }
);

// Índices para melhor performance
AnswerSchema.index({ exercise: 1, createdAt: -1 });
AnswerSchema.index({ author: 1 });
AnswerSchema.index({ parentAnswer: 1, createdAt: -1 });

module.exports = mongoose.model("Answer", AnswerSchema);

