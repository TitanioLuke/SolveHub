const mongoose = require("mongoose");

const ReportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    targetType: {
      type: String,
      required: true,
      enum: ["EXERCISE", "ANSWER"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
    },
    reason: {
      type: String,
      required: true,
      enum: ["SPAM", "OFFENSIVE", "FALSE_INFO", "OTHER"],
    },
    details: {
      type: String,
      maxlength: [300, "Os detalhes não podem ter mais de 300 caracteres"],
    },
    status: {
      type: String,
      enum: ["PENDENTE", "RESOLVIDO"],
      default: "PENDENTE",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Report", ReportSchema);

