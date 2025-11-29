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

    subject: {
      type: String,
      required: [true, "A disciplina/assunto é obrigatória"],
      trim: true,
    },

    tags: [
      {
        type: String,
        trim: true,
      }
    ],

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Exercise", ExerciseSchema);
