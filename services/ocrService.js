   const axios = require("axios");
const http = require("http");
const https = require("https");
 const pLimit = require("p-limit").default;
const fs = require("fs");
// 🔥 limit concurrency (VERY IMPORTANT kwa scale)
const limit = pLimit(5);

// 🔥 delay helper (retry backoff)
const delay = (ms) =>
  new Promise((res) => setTimeout(res, ms));

// 🔥 fallback models
const MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash"
];

// 🔥 axios instance with keep-alive (performance boost)
const httpClient = axios.create({
  timeout: 60000,
  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 50,
  }),
  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 50,
  }),
  maxContentLength: 10 * 1024 * 1024,
  maxBodyLength: 10 * 1024 * 1024,
});

// 🔥 strict prompt (token efficient + clean output)
const PROMPT = `
Extract ALL product rows from this receipt.

Return ONLY:
Name Qty Total

Rules:
- One item per line
- No explanation
- No currency symbols
- Do not skip any item
`;
 

// 🔥 core OCR processor
const processOCR = async (file) => {
console.log("📂 FILE CHECK:", {
  hasFile: !!file,
  hasBuffer: !!file?.buffer,
  hasPath: !!file?.path,
  mimetype: file?.mimetype,
  size: file?.size,
});

  if (!file) {
  throw new Error("No file provided");
}

let imageBase64;

// ✅ kama buffer ipo
if (file.buffer) {
  imageBase64 = file.buffer.toString("base64");
}

// ✅ fallback kama buffer haipo
 else if (file.path) {
  const fileData = fs.readFileSync(file.path);
  imageBase64 = fileData.toString("base64");
}
// ❌ hakuna valid file
else {
  console.log("⚠️ File object:", file);
  throw new Error("Invalid file (no buffer/path)");
}

  // 🔥 loop models
  for (let m = 0; m < MODELS.length; m++) {
    const model = MODELS[m];

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // 🔥 retry attempts
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        console.log(
          `➡️ OCR | model=${model} | attempt=${attempt + 1}`
        );

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
                        mime_type:
                          file.mimetype ||
                          "image/jpeg",
                        data: imageBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0,
                maxOutputTokens: 4096,
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
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        // 🔥 validate response
        if (!text || text.length < 10) {
          throw new Error("Empty OCR response");
        }

        console.log("✅ OCR success");

        return text
          .replace(/\r/g, "")
          .replace(/\n{2,}/g, "\n")
          .replace(/[ ]{2,}/g, " ")
          .trim();

      } catch (error) {
        const status =
          error.response?.status;

        console.log("❌ OCR fail:", {
          model,
          attempt,
          status,
          message: error.message,
        });

        // 🔥 retry only for overload / timeout
        if (
          (status === 503 ||
            error.code === "ECONNABORTED") &&
          attempt < 2
        ) {
          const wait =
            2000 * (attempt + 1);

          console.log(
            `⏳ retry in ${wait}ms`
          );

          await delay(wait);
          continue;
        }

        // 🔥 try next model
        break;
      }
    }
  }

  throw new Error(
    "OCR failed after retries (server busy or timeout)"
  );
};

// 🔥 public function with concurrency control
const readImageText = (file) =>
  limit(() => processOCR(file));

module.exports = { readImageText };
