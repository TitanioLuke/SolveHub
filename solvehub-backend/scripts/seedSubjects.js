const mongoose = require("mongoose");
const Subject = require("../src/models/Subject");
require("dotenv").config();

// Lista de disciplinas hardcoded encontradas no código
const SUBJECTS = [
  "Cálculo",
  "Base de Dados",
  "Redes",
  "Sistemas",
  "Programação"
];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB conectado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB:", error.message);
    process.exit(1);
  }
};

const seedSubjects = async () => {
  try {
    await connectDB();

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const subjectName of SUBJECTS) {
      try {
        const existing = await Subject.findOne({ name: subjectName });
        
        if (existing) {
          console.log(`⏭️  Disciplina "${subjectName}" já existe, a saltar...`);
          skipped++;
        } else {
          const subject = new Subject({ name: subjectName });
          await subject.save();
          console.log(`✅ Disciplina "${subjectName}" criada (slug: ${subject.slug})`);
          created++;
        }
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⏭️  Disciplina "${subjectName}" já existe (duplicado), a saltar...`);
          skipped++;
        } else {
          console.error(`❌ Erro ao criar disciplina "${subjectName}":`, error.message);
        }
      }
    }

    console.log("\n📊 Resumo:");
    console.log(`   ✅ Criadas: ${created}`);
    console.log(`   ⏭️  Saltadas: ${skipped}`);
    console.log(`   📝 Total processadas: ${SUBJECTS.length}`);

    const totalInDB = await Subject.countDocuments();
    console.log(`\n📚 Total de disciplinas na BD: ${totalInDB}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao fazer seed:", error);
    process.exit(1);
  }
};

seedSubjects();

