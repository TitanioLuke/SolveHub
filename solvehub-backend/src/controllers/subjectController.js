const Subject = require("../models/Subject");

// ===============================
// GET ALL SUBJECTS (Público)
// ===============================
exports.getSubjects = async (req, res) => {
  try {
    const { popular } = req.query;
    
    let query = Subject.find();
    
    if (popular === "true") {
      query = query.where({ isPopular: true });
    }
    
    const subjects = await query
      .select("_id name slug isPopular")
      .sort({ name: 1 });

    res.json(subjects);
  } catch (error) {
    console.error("Erro ao obter disciplinas:", error);
    res.status(500).json({ message: "Erro interno do servidor." });
  }
};

