const mongoose = require("mongoose");
const Exercise = require("../src/models/Exercise");
const Subject = require("../src/models/Subject");
require("dotenv").config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB conectado com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB:", error.message);
    process.exit(1);
  }
};

const migrateExercises = async () => {
  try {
    await connectDB();

    console.log("🔄 A iniciar migração de exercícios...\n");

    // Buscar todos os exercícios que têm subject (string) mas não têm subjectId
    const exercises = await Exercise.find({
      $or: [
        { subjectId: { $exists: false } },
        { subjectId: null },
        { subject: { $exists: true, $ne: null } }
      ]
    });

    console.log(`📊 Encontrados ${exercises.length} exercícios para migrar\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    const subjectMap = new Map();

    for (const exercise of exercises) {
      try {
        // Se já tem subjectId válido, saltar
        if (exercise.subjectId && mongoose.Types.ObjectId.isValid(exercise.subjectId)) {
          const subjectExists = await Subject.findById(exercise.subjectId);
          if (subjectExists) {
            skipped++;
            continue;
          }
        }

        // Se não tem subject (string), saltar
        if (!exercise.subject || !exercise.subject.trim()) {
          console.log(`⏭️  Exercício ${exercise._id} não tem subject, a saltar...`);
          skipped++;
          continue;
        }

        const subjectName = exercise.subject.trim();

        // Verificar cache primeiro
        let subjectDoc = subjectMap.get(subjectName);

        if (!subjectDoc) {
          // Tentar encontrar subject por nome
          subjectDoc = await Subject.findOne({ name: subjectName });

          if (!subjectDoc) {
            // Se não encontrar, criar novo subject
            console.log(`📝 Criando nova disciplina: "${subjectName}"`);
            subjectDoc = new Subject({ name: subjectName });
            await subjectDoc.save();
          }

          // Adicionar ao cache
          subjectMap.set(subjectName, subjectDoc);
        }

        // Atualizar exercício
        exercise.subjectId = subjectDoc._id;
        // Manter subject (string) para compatibilidade
        exercise.subject = subjectDoc.name;
        await exercise.save();

        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ Migrados ${migrated} exercícios...`);
        }
      } catch (error) {
        console.error(`❌ Erro ao migrar exercício ${exercise._id}:`, error.message);
        errors++;
      }
    }

    console.log("\n📊 Resumo da migração:");
    console.log(`   ✅ Migrados: ${migrated}`);
    console.log(`   ⏭️  Saltados: ${skipped}`);
    console.log(`   ❌ Erros: ${errors}`);
    console.log(`   📝 Total processados: ${exercises.length}`);

    // Verificar resultado final
    const totalWithSubjectId = await Exercise.countDocuments({
      subjectId: { $exists: true, $ne: null }
    });
    const totalExercises = await Exercise.countDocuments();
    console.log(`\n📚 Estatísticas finais:`);
    console.log(`   Total de exercícios: ${totalExercises}`);
    console.log(`   Exercícios com subjectId: ${totalWithSubjectId}`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao fazer migração:", error);
    process.exit(1);
  }
};

migrateExercises();

