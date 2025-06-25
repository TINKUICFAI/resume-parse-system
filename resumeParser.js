const pdf = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(fileBuffer, mimeType) {
  console.log("📄 File type detected:", mimeType);

  if (mimeType === "application/pdf") {
    const data = await pdf(fileBuffer);
    console.log("📄 Extracted PDF text:", data.text.slice(0, 300));
    return data.text;
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
    console.log("📄 Extracted DOCX text:", value.slice(0, 300));
    return value;
  }

  throw new Error("Unsupported file type");
}

module.exports = {
  extractText,
};
