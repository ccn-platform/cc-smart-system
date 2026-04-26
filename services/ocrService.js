  const fs = require("fs");
const OpenAI =
require("openai");

const client =
new OpenAI({
  apiKey:
    process.env.OPENAI_API_KEY
});

const readImageText =
async (imageUri) => {
  try {

    const imageBase64 =
      fs.readFileSync(
        imageUri,
        {
          encoding:
            "base64"
        }
      );

    const response =
      await client.chat.completions.create({
        model:
          "gpt-4o-mini",
        messages: [
          {
            role:
              "system",
            content:
`You read handwritten supplier orders.

Convert the image into clean typed product lines only.

Rules:
1. Return only order items.
2. One item per line.
3. Format:
ProductName Qty TotalPrice
4. Fix spelling if obvious.
5. No explanation.
6. No JSON.`
          },
          {
            role:
              "user",
            content: [
              {
                type:
                  "text",
                text:
                  "Read this order image"
              },
              {
                type:
                  "image_url",
                image_url: {
                  url:
`data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0
      });

    const text =
      response
      .choices[0]
      .message
      .content
      .trim();

    return text;

  } catch (error) {
    throw new Error(
      "Failed to read image text"
    );
  }
};

module.exports = {
  readImageText
};
