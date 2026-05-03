 const axios = require("axios");

const readImageText = async (file) => {
  try {
    console.log("➡️ Starting OCR...");

    const imageBase64 = file.buffer.toString("base64");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // 🔥 prompt fupi (fast)
    const prompt = `
Extract product items from this receipt.

Format:
ProductName Qty Total

Example:
Sugar 5 25000
Rice 10 78000

Rules:
- Ignore totals
- Ignore phone numbers
- No explanation
`;

    const response = await axios.post(
      url,
      {
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: file.mimetype || "image/jpeg",
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1024,
        },
      },
      {
        timeout: 20000, // 🔥 muhimu
      }
    );

    console.log("✅ OCR done");

    const text =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return String(text)
      .replace(/\r/g, "")
      .replace(/\n{2,}/g, "\n")
      .replace(/[ ]{2,}/g, " ")
      .trim();

  } catch (error) {
    console.log("❌ GEMINI ERROR:", {
      message: error.message,
      data: error.response?.data,
    });

    throw new Error("OCR failed");
  }
};

module.exports = { readImageText };
