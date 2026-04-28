const axios =
require("axios");

const PROJECT_ID =
"striking-bot-494704-u3";

const REGION =
"us-central1";

const readImageText =
async (file) => {
  try {
    const imageBase64 =
      file.buffer.toString(
        "base64"
      );

    const url =
`https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/publishers/google/models/gemini-2.0-flash:generateContent`;

    const prompt = `
Read this supplier order image carefully.

The image may contain many different products.

Identify every product row/item.

For each item extract:

1. Product name
2. Quantity
3. Total purchase amount

Return plain text only.

One item per line.

Use this exact format:

ProductName Qty Total

Examples:

Sugar 5 25000
Rice 10 78000
Soap 24 36000

Rules:

- Detect all products
- Ignore headings
- Ignore dates
- Ignore phone numbers
- Ignore signatures
- Ignore grand totals
- Ignore random text
- No numbering
- No explanation
`;

    const response =
      await axios.post(
        url,
        {
          contents: [
            {
              role: "user",
              parts: [
                {
                  text:
                    prompt
                },
                {
                  inlineData:
                    {
                      mimeType:
                        file.mimetype ||
                        "image/jpeg",
                      data:
                        imageBase64
                    }
                }
              ]
            }
          ],
          generationConfig:
            {
              temperature: 0,
              topP: 1,
              maxOutputTokens: 2048
            }
        },
        {
          headers: {
            Authorization:
`Bearer ${process.env.GEMINI_API_KEY}`,
            "Content-Type":
              "application/json"
          }
        }
      );

    const text =
      response.data
        ?.candidates?.[0]
        ?.content
        ?.parts?.[0]
        ?.text || "";

    return String(text)
      .replace(/\r/g, "")
      .replace(/\n{2,}/g, "\n")
      .replace(/[ ]{2,}/g, " ")
      .trim();

  } catch (error) {
    console.log(
      "VERTEX GEMINI ERROR:",
      error.response
        ?.data ||
        error.message
    );

    throw new Error(
      "Failed to read image text"
    );
  }
};

module.exports = {
  readImageText
};
