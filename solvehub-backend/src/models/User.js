const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    avatar: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    role: {
      type: String,
      enum: ["admin", "aluno", "professor"],
      default: "aluno",
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    savedExercises: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise",
      },
    ],

    completedExercises: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Exercise",
      },
    ],

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
