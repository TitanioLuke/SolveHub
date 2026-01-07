const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const fs = require("fs");
const path = require("path");

// Importar modelos e utilitários
const Exercise = require("../src/models/Exercise");
const Answer = require("../src/models/Answer");
const { uploadBufferToCloudinary } = require("../src/utils/cloudinaryUpload");
const connectDB = require("../src/config/db");

/**
 * Script para migrar anexos locais para Cloudinary
 * 
 * Este script:
 * 1. Percorre exercícios e respostas com attachments sem publicId e URL local
 * 2. Faz upload do ficheiro local para Cloudinary
 * 3. Substitui URL pelo secure_url e preenche publicId
 * 4. (Opcional) Apaga ficheiro local depois de migrar
 * 
 * Uso: node scripts/migrateLocalUploadsToCloudinary.js [--delete-local]
 */

const DELETE_LOCAL_AFTER_MIGRATION = process.argv.includes("--delete-local");

async function migrateAttachments() {
  try {
    // Conectar à base de dados
    await connectDB();
    console.log("✓ Conectado à base de dados");

    let migratedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    // Migrar anexos de exercícios
    console.log("\n📦 Migrando anexos de exercícios...");
    const exercises = await Exercise.find({}).lean();
    
    for (const exercise of exercises) {
      if (!exercise.attachments || exercise.attachments.length === 0) {
        continue;
      }

      let hasUpdates = false;
      const updatedAttachments = [];

      for (const attachment of exercise.attachments) {
        // Se já tem publicId, é do Cloudinary - pular
        if (attachment.publicId) {
          updatedAttachments.push(attachment);
          skippedCount++;
          continue;
        }

        // Se URL já é completo (http/https), é Cloudinary - pular
        if (attachment.url && attachment.url.startsWith("http")) {
          updatedAttachments.push(attachment);
          skippedCount++;
          continue;
        }

        // Se não começa com /uploads, não é um anexo local - pular
        if (!attachment.url || !attachment.url.startsWith("/uploads")) {
          updatedAttachments.push(attachment);
          skippedCount++;
          continue;
        }

        // Construir caminho completo do ficheiro
        const filePath = path.join(__dirname, "..", attachment.url);

        // Verificar se ficheiro existe
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️  Ficheiro não encontrado: ${filePath} (anexo: ${attachment.url})`);
          updatedAttachments.push(attachment);
          errorCount++;
          continue;
        }

        try {
          // Ler ficheiro
          const fileBuffer = fs.readFileSync(filePath);

          // Fazer upload para Cloudinary
          console.log(`  📤 Fazendo upload de: ${attachment.url}`);
          const uploadResult = await uploadBufferToCloudinary(fileBuffer, {
            filename: attachment.filename || path.basename(attachment.url),
          });

          // Criar novo attachment com dados do Cloudinary
          updatedAttachments.push({
            ...attachment,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            size: uploadResult.bytes,
            createdAt: attachment.createdAt || new Date(),
          });

          // (Opcional) Apagar ficheiro local
          if (DELETE_LOCAL_AFTER_MIGRATION) {
            try {
              fs.unlinkSync(filePath);
              console.log(`  ✓ Ficheiro local apagado: ${filePath}`);
            } catch (deleteError) {
              console.error(`  ✗ Erro ao apagar ficheiro local: ${deleteError.message}`);
            }
          }

          migratedCount++;
          hasUpdates = true;
          console.log(`  ✓ Migrado com sucesso: ${uploadResult.url}`);
        } catch (uploadError) {
          console.error(`  ✗ Erro ao fazer upload: ${uploadError.message}`);
          updatedAttachments.push(attachment); // Manter original em caso de erro
          errorCount++;
        }
      }

      // Atualizar exercício se houver mudanças
      if (hasUpdates) {
        await Exercise.updateOne(
          { _id: exercise._id },
          { $set: { attachments: updatedAttachments } }
        );
        console.log(`✓ Exercício ${exercise._id} atualizado`);
      }
    }

    // Migrar anexos de respostas
    console.log("\n💬 Migrando anexos de respostas...");
    const answers = await Answer.find({}).lean();

    for (const answer of answers) {
      if (!answer.attachments || answer.attachments.length === 0) {
        continue;
      }

      let hasUpdates = false;
      const updatedAttachments = [];

      for (const attachment of answer.attachments) {
        // Se já tem publicId, é do Cloudinary - pular
        if (attachment.publicId) {
          updatedAttachments.push(attachment);
          skippedCount++;
          continue;
        }

        // Se URL já é completo (http/https), é Cloudinary - pular
        if (attachment.url && attachment.url.startsWith("http")) {
          updatedAttachments.push(attachment);
          skippedCount++;
          continue;
        }

        // Se não começa com /uploads, não é um anexo local - pular
        if (!attachment.url || !attachment.url.startsWith("/uploads")) {
          updatedAttachments.push(attachment);
          skippedCount++;
          continue;
        }

        // Construir caminho completo do ficheiro
        const filePath = path.join(__dirname, "..", attachment.url);

        // Verificar se ficheiro existe
        if (!fs.existsSync(filePath)) {
          console.warn(`⚠️  Ficheiro não encontrado: ${filePath} (anexo: ${attachment.url})`);
          updatedAttachments.push(attachment);
          errorCount++;
          continue;
        }

        try {
          // Ler ficheiro
          const fileBuffer = fs.readFileSync(filePath);

          // Fazer upload para Cloudinary
          console.log(`  📤 Fazendo upload de: ${attachment.url}`);
          const uploadResult = await uploadBufferToCloudinary(fileBuffer, {
            filename: attachment.filename || path.basename(attachment.url),
          });

          // Criar novo attachment com dados do Cloudinary
          updatedAttachments.push({
            ...attachment,
            url: uploadResult.url,
            publicId: uploadResult.publicId,
            size: uploadResult.bytes,
            createdAt: attachment.createdAt || new Date(),
          });

          // (Opcional) Apagar ficheiro local
          if (DELETE_LOCAL_AFTER_MIGRATION) {
            try {
              fs.unlinkSync(filePath);
              console.log(`  ✓ Ficheiro local apagado: ${filePath}`);
            } catch (deleteError) {
              console.error(`  ✗ Erro ao apagar ficheiro local: ${deleteError.message}`);
            }
          }

          migratedCount++;
          hasUpdates = true;
          console.log(`  ✓ Migrado com sucesso: ${uploadResult.url}`);
        } catch (uploadError) {
          console.error(`  ✗ Erro ao fazer upload: ${uploadError.message}`);
          updatedAttachments.push(attachment); // Manter original em caso de erro
          errorCount++;
        }
      }

      // Atualizar resposta se houver mudanças
      if (hasUpdates) {
        await Answer.updateOne(
          { _id: answer._id },
          { $set: { attachments: updatedAttachments } }
        );
        console.log(`✓ Resposta ${answer._id} atualizada`);
      }
    }

    // Resumo
    console.log("\n" + "=".repeat(50));
    console.log("📊 Resumo da migração:");
    console.log(`  ✓ Migrados: ${migratedCount}`);
    console.log(`  ⏭️  Pulados (já no Cloudinary): ${skippedCount}`);
    console.log(`  ✗ Erros: ${errorCount}`);
    console.log("=".repeat(50));

    if (DELETE_LOCAL_AFTER_MIGRATION) {
      console.log("\n⚠️  Nota: Ficheiros locais foram apagados após migração");
    } else {
      console.log(
        "\n💡 Dica: Para apagar ficheiros locais após migração, execute:"
      );
      console.log("   node scripts/migrateLocalUploadsToCloudinary.js --delete-local");
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro fatal:", error);
    process.exit(1);
  }
}

// Executar migração
if (require.main === module) {
  migrateAttachments().catch((error) => {
    console.error("❌ Erro:", error);
    process.exit(1);
  });
}

module.exports = migrateAttachments;
