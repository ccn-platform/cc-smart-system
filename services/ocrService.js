const axios =
require("axios");

const readImageText =
async (file) => {
  try {
    const imageBase64 =
      file.buffer.toString(
        "base64"
      );

 const url =
`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;

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
              parts: [
                {
                  text:
                    prompt
                },
                {
                  inline_data:
                    {
                      mime_type:
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
              topK: 1,
              topP: 1,
              maxOutputTokens: 2048
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
      "GEMINI ERROR:",
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
