const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const { v4: uuidv4 } = require("uuid");

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

function formatCandidateData(file, parsed) {
  const [firstName = "", lastName = ""] = parsed.fullName?.split(" ") || [];
  const displayName = parsed.fullName || `${firstName} ${lastName}`;
  const uuid = uuidv4();

  return {
    fileDetails: {
      id: 0,
      name: file.name,
      size: file.size,
      contentType: file.mimetype,
      location: `resumes/${uuid.replace(/-/g, "")}.pdf`,
    },
    resumeParseAndIndexIdentifier: uuid,
    candidateProfile: {
      firstName,
      middleName: "",
      lastName,
      displayName,
      email: parsed.email || "",
      phone: parsed.phoneNumber || "",
      mobilePhone: {
        countryCode: "+91",
        number: parsed.phoneNumber || "",
      },
      standardFields: {
        currentLocation: {
          answer: "",
          multipleAnswers: {},
        },
        workExperience: {
          answer: JSON.stringify({
            Years: Math.floor(((parsed.totalExperience || 0) * 12) / 12),
            Months: Math.floor(((parsed.totalExperience || 0) * 12) % 12),
            TotalMonths: Math.floor((parsed.totalExperience || 0) * 12),
          }),
          multipleAnswers: {},
        },
      },
      educationDetails: (parsed.education || []).map((edu) => ({
        identifier: uuidv4(),
        degree: edu.degree || "",
        branch: edu.specialization || "",
        dateOfCompletion: edu.year ? `${edu.year}-12-31T00:00:00` : null,
        university: edu.university || "",
        location: "",
      })),
      experienceDetails: (parsed.experience || []).map((exp) => ({
        identifier: uuidv4(),
        companyName: exp.company || "",
        designation: exp.title || "",
        isCurrentlyWorking: false,
        dateOfJoining: "2022-01-01T00:00:00", // fallback
        dateOfRelieving: "2023-01-01T00:00:00", // fallback
        location: "",
      })),
      resume: {
        id: 0,
        name: file.name,
        size: file.size,
        contentType: file.mimetype,
        location: `resumes/${uuid.replace(/-/g, "")}.pdf`,
      },
      skills: (parsed.skills || []).map((skill) => ({
        identifier: uuidv4(),
        name: skill,
        experience: "0",
      })),
    },
  };
}

function extractStructuredInfo(text) {
  const data = {
    fullName: "",
    email: "",
    phoneNumber: "",
    skills: [],
    education: [],
    experience: [],
    totalExperience: 0.5,
  };

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  // Email
  const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
  if (emailMatch) data.email = emailMatch[0];

  // Phone
  const phoneMatch = text.match(/(?:\+91[-\s]?)?\d{10}/);
  if (phoneMatch) data.phoneNumber = phoneMatch[0].replace(/\D/g, "");

  // Name
  const firstLine = lines[0];
  if (/^[A-Z][a-z]+\s[A-Z][a-z]+/.test(firstLine)) {
    data.fullName = firstLine;
  } else if (data.email) {
    const guessedName = data.email.split("@")[0].replace(/[\d._-]/g, " ");
    data.fullName = guessedName
      .split(" ")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");
  }

  // Skills
  const skillKeywords = [
    "javascript",
    "nodejs",
    "react",
    "docker",
    "mongodb",
    "sql",
    "aws",
    "scrum",
    "agile",
    "jest",
    "redis",
    "kafka",
    "nestjs",
    "express",
    "mysql",
    "typescript",
    "jira",
    "testing",
    "html",
    "css",
    "git",
    "github",
    "sqs",
  ];
  data.skills = skillKeywords.filter((skill) =>
    text.toLowerCase().includes(skill)
  );

  // Education
  const eduRegex =
    /(?:B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|MBA|B\.?Com|M\.?Com)[^\n]*/gi;
  const yearRegex = /\b(19|20)\d{2}\b/g;
  const universityRegex = /(?:University|Institute|College|School)[^\n,]*/gi;

  const educationMatches = text.match(eduRegex);
  if (educationMatches) {
    educationMatches.forEach((line) => {
      const degree =
        line.match(
          /(B\.?Tech|M\.?Tech|B\.?Sc|M\.?Sc|MBA|B\.?Com|M\.?Com)/i
        )?.[0] || "";
      const year = [...line.matchAll(yearRegex)].map((y) => y[0])[0] || "";
      const specialization =
        line.match(
          /Computer|Science|Commerce|Engineering|Finance|Physics|Marketing/i
        )?.[0] || "";
      const university = line.match(universityRegex)?.[0] || "";

      data.education.push({
        degree,
        specialization,
        university,
        year,
      });
    });
  }

  // Experience
  const expStartIndex = lines.findIndex((line) => /experience/i.test(line));
  if (expStartIndex !== -1) {
    const expLines = lines.slice(expStartIndex + 1, expStartIndex + 20); // assume 20 lines max
    let current = {};
    for (const line of expLines) {
      if (/^[A-Z][a-z]{2,}/.test(line) && !current.title) {
        current.title = line;
      } else if (/at|from|by/i.test(line) && !current.company) {
        current.company = line;
      } else if (/\d{4}/.test(line) && !current.duration) {
        current.duration = line;
      } else {
        current.description = (current.description || "") + " " + line;
      }
    }
    if (current.title) data.experience.push(current);
  }

  return data;
}

module.exports = {
  extractText,
  formatCandidateData,
  extractStructuredInfo,
};
