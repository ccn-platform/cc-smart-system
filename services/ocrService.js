 const axios = require("axios");
const http = require("http");
const https = require("https");
const pLimit = require("p-limit").default;
const sharp = require("sharp");
const fs = require("fs/promises");

const limit = pLimit(5);

const delay = (ms) =>
  new Promise((res) => setTimeout(res, ms));

const MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash",
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
You are a STRICT OCR extraction engine.

Extract EVERY visible product row.

OUTPUT:
PRODUCT_NAME | QTY | TOTAL

RULES:
- Return ALL visible rows
- One row per line
- Preserve exact spelling
- Preserve exact capitalization
- Do not skip rows
- Do not summarize
- Do not explain
- Do not merge rows
- If unclear use [UNCLEAR]
`;

const callGeminiOCR = async (
  imageBase64,
  mimeType
) => {
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const url =
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

        const response =
          await httpClient.post(
            url,
            {
              contents: [
                {
                  parts: [
                    { text: PROMPT },
                    {
                      inline_data: {
                        mime_type: mimeType,
                        data: imageBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 4000,
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
            ?.content?.parts?.[0]?.text;

        if (!text || text.length < 5) {
          throw new Error("Empty OCR");
        }

        return text;
      } catch (error) {
        const retryable =
          [429, 500, 502, 503, 504];

        const status =
          error.response?.status;

        if (
          (retryable.includes(status) ||
            error.code === "ECONNABORTED") &&
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

  throw new Error("OCR failed");
};

const splitImageIntoChunks = async (
  buffer
) => {
  const meta =
    await sharp(buffer).metadata();

  const width = meta.width;
  const height = meta.height;

  const chunkHeight = 1200;

  const chunks = [];

  for (
    let top = 0;
    top < height;
    top += chunkHeight
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
        .jpeg({ quality: 95 })
        .toBuffer();

    chunks.push(chunk);
  }

  return chunks;
};

const normalizeOCR = (text) => {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) =>
      line.includes("|")
    );
};

const dedupeRows = (rows) => {
  return [...new Set(rows)];
};

const processOCR = async (file) => {
  if (!file)
    throw new Error("No file");

  if (!process.env.GEMINI_API_KEY) {
    throw new Error(
      "OCR not configured"
    );
  }

  let buffer;

  if (file.buffer) {
    buffer = file.buffer;
  } else if (file.path) {
    buffer =
      await fs.readFile(file.path);
  } else {
    throw new Error(
      "Invalid file"
    );
  }

  const chunks =
    await splitImageIntoChunks(buffer);

  const results =
    await Promise.all(
      chunks.map((chunk) =>
        limit(async () => {
          const base64 =
            chunk.toString("base64");

          const text =
            await callGeminiOCR(
              base64,
              "image/jpeg"
            );

          return normalizeOCR(text);
        })
      )
    );

  const merged =
    dedupeRows(results.flat());

  if (!merged.length) {
    throw new Error(
      "No OCR rows found"
    );
  }

  return merged.join("\n");
};

const readImageText = (file) =>
  processOCR(file);

module.exports = { readImageText };
