const OpenAI = require("openai");
require("dotenv").config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Calls OpenAI to parse resume text based on UI fields only
 */
const callGPTToParseResume = async (resumeText) => {
  try {
    // const cleanText = resumeText
    //   .trim()
    //   .replace(/\s{2,}/g, " ")
    //   .slice(0, 3000); // Limit to 3K chars to reduce tokens

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: `You are a professional resume parser. Extract only the following fields from the resume text and return a clean JSON object:

{
  "fullName": "",
  "phoneNumber": "",
  "email": "",
  "dob": "",
  "gender": "",
  "currentLocation": "",
  "preferredJobLocation": [],
  "country": "",
  "state": "",
  "city": "",
  "zipCode": "",
  "workExperience": [
    {
      "companyName": "",
      "designation": "",
      "product": "",
      "department": "",
      "jobType": "",
      "startMonthYear": "",
      "endMonthYear": "",
      "currentlyWorking": false
    }
  ],
  "skills": [],
  "mayAlsoKnow": [],
  "education": [
    {
      "instituteName": "",
      "courseName": "",
      "gradePercentage": "",
      "startYear": "",
      "endYear": ""
    }
  ]
}

Return only valid JSON. Leave any field blank if unknown.`,
        },
        {
          role: "user",
          content: resumeText,
        },
      ],
    });

    const rawOutput = response.choices[0]?.message?.content?.trim();

    try {
      return JSON.parse(rawOutput);
    } catch (err) {
      console.error("❌ Invalid JSON from GPT:\n", rawOutput);
      return {};
    }
  } catch (err) {
    console.error("❌ OpenAI API error:", err.message);
    return {};
  }
};

module.exports = {
  callGPTToParseResume,
};
