const express = require("express");
const fileUpload = require("express-fileupload");
const bodyParser = require("body-parser");
const mime = require("mime-types");

const {
  extractText,
  formatCandidateData,
  extractStructuredInfo,
} = require("./resumeParser");

const app = express();
const PORT = 5000;

app.use(fileUpload());
app.use(bodyParser.json());

app.post("/parse-resume", async (req, res) => {
  try {
    if (!req.files || !req.files.resume) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });
    }

    const resume = req.files.resume;
    const mimeType = mime.lookup(resume.name) || resume.mimetype;
    const text = await extractText(resume.data, mimeType);

    const parsedData = require("./resumeParser").extractStructuredInfo(text);
    const response = formatCandidateData(resume, parsedData);

    return res.status(200).json(response);
  } catch (err) {
    console.error("Error parsing resume:", err);
    res
      .status(500)
      .json({ success: false, message: "Failed to process resume." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Resume Parser API running at http://localhost:${PORT}`);
});
