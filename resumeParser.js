const pdf = require("pdf-parse");
const mammoth = require("mammoth");

async function extractText(fileBuffer, mimeType) {
  if (mimeType === "application/pdf") {
    const data = await pdf(fileBuffer);
    return data.text;
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const { value } = await mammoth.extractRawText({ buffer: fileBuffer });
    return value;
  }

  throw new Error("Unsupported file type");
}

function extractExperienceArray(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Find index of a clean 'Experience' section start
  const startIndex = lines.findIndex((line) =>
    /^(work\s+)?experience$/i.test(line)
  );

  if (startIndex === -1) return []; // fallback if not found

  const relevantLines = lines.slice(startIndex + 1); // Skip the "Experience" title line

  const experience = [];
  let current = null;
  let captureDescription = false;

  const dateRegex =
    /(from|duration|tenure|since)?[:\-]?\s*(\(?\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\)?\s*(to|–|-)?\s*(\(?\d{1,2}[\/\-]\d{1,2}[\/\-](\d{2,4}|present)\)?)?)/i;

  for (let i = 0; i < relevantLines.length; i++) {
    const line = relevantLines[i];

    // Match job title + company
    if (
      i < relevantLines.length - 1 &&
      /^[A-Za-z ]{2,50}$/.test(relevantLines[i]) &&
      /^[A-Z][A-Za-z&\-. ]{3,50}$/.test(relevantLines[i + 1])
    ) {
      if (current) experience.push(current);
      current = {
        title: relevantLines[i],
        company: relevantLines[i + 1],
        duration: "",
        description: "",
      };
      captureDescription = true;
      i++; // skip next line
      continue;
    }

    if (dateRegex.test(line)) {
      if (current) {
        current.duration = line
          .replace(/(from|duration|tenure|since)[:\-]?\s*/i, "")
          .trim();
        captureDescription = true;
        continue;
      }
    }

    // Add to description
    if (
      captureDescription &&
      current &&
      line.length > 10 &&
      !line.startsWith("•")
    ) {
      current.description += (current.description ? " " : "") + line;
    }

    // Stop if new section starts
    if (
      /^(education|skills|projects|summary|profile|declaration)$/i.test(line)
    ) {
      captureDescription = false;
    }
  }

  if (current) experience.push(current);
  return experience;
}

function extractStructuredInfo(text) {
  const data = {
    fullName: "",
    email: "",
    phoneNumber: "",
    address: "",
    education: [],
    experience: [],
    computerSkills: "",
    interpersonalSkills: "",
    dob: "",
    languages: [],
    hobbies: "",
    interests: "",
  };

  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) data.email = emailMatch[0];

  const phoneMatch = text.match(/(\+91[\s-]?)?(\d{5}[\s-]?\d{5})/);
  if (phoneMatch) data.phoneNumber = phoneMatch[0].replace(/[\s-]/g, "");

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const addressLine = lines.find((line) =>
    /(address|residential address|present address|permanent address)[:\-]?\s*/i.test(
      line
    )
  );
  if (addressLine) {
    data.address = addressLine
      .replace(
        /(address|residential address|present address|permanent address)[:\-]?\s*/i,
        ""
      )
      .trim();
  }

  const possibleName = lines[0];
  if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(possibleName)) {
    data.fullName = possibleName;
  } else if (data.email) {
    const prefix = data.email
      .split("@")[0]
      .replace(/\d+/g, "")
      .replace(/[._-]/g, " ");
    data.fullName = prefix
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } else {
    data.fullName = "Unknown";
  }

  const eduPattern =
    /(?:B\.?Sc|M\.?Sc|B\.?Com|M\.?Com|B\.?Tech|M\.?Tech|MBA|PGDM|LLB)[^\n]*(?:\n[^\n]*){0,4}/gi;
  const percentRegex = /(\d{1,3})\s*%/;
  const yearRegex = /\b(19|20)\d{2}\b/;
  data.education = [];

  const educationMatches = text.match(eduPattern);
  if (educationMatches) {
    educationMatches.forEach((entry) => {
      const degree =
        (entry.match(/(MBA|PGDM|LLB|B\.?Sc|M\.?Sc|B\.?Tech|M\.?Tech)/i) ||
          [])[0] || "";
      const percentage = (entry.match(percentRegex) || [])[1] || "";
      const year = (entry.match(yearRegex) || [])[0] || "";
      const specialization =
        (entry.match(/Finance|Physics|Marketing|Computer/i) || [])[0] || "";
      const university = (entry.match(/University[^,\n]+/i) || [])[0] || "";
      data.education.push({
        degree: degree.toUpperCase(),
        specialization,
        university,
        percentage,
        year,
      });
    });
  }

  const expSection = text.split(/experience| Experience |work experience/i)[1];
  if (expSection) {
    const expLines = expSection.split(/\n/).filter((l) => l.trim().length > 3);
    let currExp = {};
    expLines.forEach((line) => {
      if (/^\d{2}\/\d{4}/.test(line) || /\d{4}\s*-\s*\d{4}/.test(line)) {
        if (currExp.title) data.experience.push(currExp);
        currExp = { duration: line.trim() };
      } else if (!currExp.title) {
        currExp.title = line.trim();
      } else if (!currExp.company) {
        currExp.company = line.trim();
      } else {
        currExp.description = (currExp.description || "") + " " + line.trim();
      }
    });
    if (currExp.title) data.experience.push(currExp);
  }

  // data.experience = extractExperienceArray(text);

  const languages = [
    "english",
    "hindi",
    "bengali",
    "kannada",
    "tamil",
    "telugu",
    "marathi",
    "gujarati",
    "punjabi",
    "urdu",
  ];
  data.languages = languages
    .filter((lang) => text.toLowerCase().includes(lang))
    .map((lang) => lang.charAt(0).toUpperCase() + lang.slice(1));

  return data;
}

module.exports = {
  extractText,
  extractStructuredInfo,
};
