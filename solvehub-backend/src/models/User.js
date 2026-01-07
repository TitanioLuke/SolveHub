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
      enum: ["ALUNO", "ADMIN", "aluno", "admin"],
      default: "ALUNO",
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

    notificationSettings: {
      exerciseReplies: {
        type: Boolean,
        default: true,
      },
      commentReplies: {
        type: Boolean,
        default: true,
      },
      exerciseLikes: {
        type: Boolean,
        default: false,
      },
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
