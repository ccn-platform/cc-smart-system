  const axios = require("axios");
const http = require("http");
const https = require("https");
const pLimit = require("p-limit").default;
const sharp = require("sharp");
const fs = require("fs/promises");

const limit = pLimit(3);

const delay = (ms) =>
  new Promise((res) => setTimeout(res, ms));

const MODELS = [
  "gemini-2.5-flash",
];

const httpClient = axios.create({
  timeout: 90000,
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 50,
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 50,
  }),
});
const PROMPT = `
You are an OCR transcription engine, NOT a text editor.

TASK:
Transcribe visible product rows EXACTLY as seen.

FORMAT:
PRODUCT_NAME | QTY | TOTAL

ABSOLUTE RULES:
- Copy character by character
- Preserve spelling mistakes exactly
- Preserve handwritten mistakes exactly
- Preserve abbreviations exactly
- Preserve capitalization exactly
- DO NOT autocorrect
- DO NOT rewrite words
- DO NOT normalize text
- DO NOT interpret meaning
- DO NOT guess missing letters
- DO NOT merge rows
- DO NOT skip rows
- Read top to bottom
- One row per line only
- If unreadable use [UNCLEAR]

IMPORTANT:
You are COPYING, not UNDERSTANDING.
Return ONLY rows.
`;
 
const callGeminiOCR = async (
  imageBase64
) => {
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response =
          await httpClient.post(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
            {
              contents: [
                {
                  parts: [
                    { text: PROMPT },
                    {
                      inline_data: {
                        mime_type:
                          "image/jpeg",
                        data: imageBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 2000,
              },
            },
            {
              headers: {
                "x-goog-api-key":
                  process.env.GEMINI_API_KEY,
              },
            }
          );

        const text =
          response.data?.candidates?.[0]
            ?.content?.parts
            ?.map(
              (p) => p.text || ""
            )
            .join("\n")
            .trim();

        if (!text) {
          return "";
        }
const validRows =
  normalizeOCR(text);

if (!validRows.length) {
  return "";
}

return validRows.join("\n");
        
      } catch (error) {
        const status =
          error.response?.status;

        const retryable = [
          429,
          500,
          502,
          503,
          504,
        ];

        if (
          retryable.includes(status) &&
          attempt < 2
        ) {
          await delay(
            2000 * (attempt + 1)
          );
          continue;
        }

        break;
      }
    }
  }

  return "";
};

 const splitImageIntoChunks =
  async (buffer) => {
    const meta =
      await sharp(buffer)
        .metadata();

     const width =
  meta.width;
const height =
  meta.height;

if (!width || !height) {
  throw new Error(
    "Invalid image metadata"
  );
}

    const chunkHeight = 1000;
    const overlap = 120;

    const chunks = [];

    for (
      let top = 0;
      top < height;
      top += (chunkHeight - overlap)
    ) {
      const actualHeight =
        Math.min(
          chunkHeight,
          height - top
        );

      const chunk =
        await sharp(buffer)
          .extract({
            left: 0,
            top,
            width,
            height: actualHeight,
          })
           .resize({
             width: Math.min(
              width * 2,
               2400
             )
           })
            .jpeg({
              quality: 100,
           })
          .toBuffer();

      chunks.push(chunk);
    }

    return chunks;
  };
const normalizeOCR = (
  text
) => {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) =>
         /^[^|]+\|\s*(\d+(?:\.\d+)?|\[UNCLEAR\])\s*\|\s*(\d+(?:\.\d+)?|\[UNCLEAR\])$/.test(x)
    );
};
 const removeAdjacentDuplicates = (rows) => {
  const cleaned = [];

  for (const row of rows) {
    if (
      cleaned[
        cleaned.length - 1
      ] !== row
    ) {
      cleaned.push(row);
    }
  }

  return cleaned;
};
 
const processOCR =
  async (file) => {
    if (!file) {
      throw new Error(
        "No file"
      );
    }

    let buffer;

    if (file.buffer) {
      buffer =
        file.buffer;
    } else if (
      file.path
    ) {
      buffer =
        await fs.readFile(
          file.path
        );
    } else {
      throw new Error(
        "Invalid file"
      );
    }

    const chunks =
      await splitImageIntoChunks(
        buffer
      );

    const results =
  await Promise.allSettled(
    chunks.map(
      (chunk, index) =>
        limit(
          async () => {
            const text =
              await callGeminiOCR(
                chunk.toString(
                  "base64"
                )
              );

            return {
              index,
              rows:
                normalizeOCR(
                  text
                ),
            };
          }
        )
    )
  );

    const rows =
  results
    .filter(
      (r) =>
        r.status ===
        "fulfilled"
    )
    .map(
      (r) => r.value
    )
    .sort(
      (a, b) =>
        a.index - b.index
    )
    .flatMap(
      (x) => x.rows
    );

     const merged =
  removeAdjacentDuplicates(
    rows
  );

    if (
      !merged.length
    ) {
      throw new Error(
        "No OCR rows found"
      );
    }

    return merged.join(
      "\n"
    );
  };

const readImageText = (
  file
) =>
  limit(() =>
    processOCR(file)
  );

module.exports = {
  readImageText,
};
