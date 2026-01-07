const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");

/**
 * Faz upload de um buffer para Cloudinary usando upload_stream
 * @param {Buffer} buffer - Buffer do ficheiro
 * @param {Object} options - Opções adicionais (filename, folder, etc)
 * @returns {Promise<Object>} - { url, publicId, resourceType, bytes, format, originalFilename }
 */
function uploadBufferToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    if (!buffer || buffer.length === 0) {
      return reject(new Error("Buffer vazio - não há dados para fazer upload"));
    }

    const uploadOptions = {
      resource_type: "auto", // Suporta imagem e PDF automaticamente
      folder: process.env.CLOUDINARY_FOLDER || "solvehub",
      ...options,
    };

    console.log(`    📤 Upload para Cloudinary (folder: ${uploadOptions.folder}, filename: ${options.filename || "auto"})`);

    // Converter buffer para stream
    const bufferStream = Readable.from(buffer);

    // Tratamento de erros do stream
    bufferStream.on("error", (streamError) => {
      console.error("    ❌ Erro no stream:", streamError);
      reject(new Error(`Erro no stream: ${streamError.message}`));
    });

    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (error) {
          console.error(`    ❌ Erro do Cloudinary:`, error);
          return reject(error);
        }

        if (!result || !result.secure_url) {
          console.error(`    ❌ Resultado inválido do Cloudinary:`, result);
          return reject(new Error("Resposta inválida do Cloudinary"));
        }

        console.log(`    ✓ Upload concluído: ${result.secure_url}`);

        resolve({
          url: result.secure_url, // URL HTTPS
          publicId: result.public_id,
          resourceType: result.resource_type,
          bytes: result.bytes,
          format: result.format,
          originalFilename: result.original_filename || options.filename || "file",
        });
      }
    );

    // Tratamento de erros do upload stream
    uploadStream.on("error", (uploadError) => {
      console.error("    ❌ Erro no upload stream:", uploadError);
      reject(new Error(`Erro no upload stream: ${uploadError.message}`));
    });

    bufferStream.pipe(uploadStream);
  });
}

/**
 * Apaga um anexo (Cloudinary ou ficheiro local)
 * @param {Object} attachment - Objeto attachment com url e publicId (opcional)
 * @returns {Promise<void>}
 */
async function deleteAttachment(attachment) {
  try {
    // Se tem publicId, apagar do Cloudinary
    if (attachment.publicId) {
      try {
        await cloudinary.uploader.destroy(attachment.publicId, {
          resource_type: "auto",
        });
      } catch (error) {
        console.error(`Erro ao apagar do Cloudinary (${attachment.publicId}):`, error);
        // Não falhar se erro do Cloudinary - apenas logar
      }
    }

    // Se é URL local (não começa com http/https), tentar apagar ficheiro local
    if (attachment.url && !attachment.url.startsWith("http")) {
      // Remover prefixo /uploads se existir
      const filePath = attachment.url.startsWith("/uploads")
        ? path.join(__dirname, "..", "..", attachment.url)
        : attachment.url;

      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (error) {
        console.error(`Erro ao apagar ficheiro local (${filePath}):`, error);
        // Não falhar se erro ao apagar ficheiro - apenas logar
      }
    }
  } catch (error) {
    console.error("Erro ao apagar anexo:", error);
    // Não lançar erro para não quebrar o fluxo principal
  }
}

/**
 * Apaga múltiplos anexos
 * @param {Array} attachments - Array de objetos attachment
 * @returns {Promise<void>}
 */
async function deleteAttachments(attachments) {
  if (!attachments || !Array.isArray(attachments)) {
    return;
  }

  await Promise.all(attachments.map((att) => deleteAttachment(att)));
}

module.exports = {
  uploadBufferToCloudinary,
  deleteAttachment,
  deleteAttachments,
};
