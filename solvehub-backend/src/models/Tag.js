const mongoose = require("mongoose");

const TagSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "O nome da tag é obrigatório"],
      trim: true,
      unique: true,
      maxlength: [100, "O nome não pode ter mais de 100 caracteres"],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Tag", TagSchema);

