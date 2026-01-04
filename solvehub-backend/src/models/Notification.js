const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["comment", "reply", "like"],
    },
    message: {
      type: String,
      required: true,
    },
    link: {
      type: String,
      required: true,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    relatedExercise: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
    },
    relatedAnswer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Answer",
    },
  },
  { timestamps: true }
);

// Índices para melhor performance
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model("Notification", NotificationSchema);

