    const axios = require("axios");
const http = require("http");
const https = require("https");
 const pLimit = require("p-limit").default;
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

 // 🔥 SMART OCR PROMPT
const PROMPT = `
You are an OCR engine for Tanzanian shop invoices and handwritten order sheets.

Read ALL visible product rows from the image.

Return ONLY valid product rows.

FORMAT:
PRODUCT_NAME | QTY | TOTAL

RULES:
- Keep original product names
- Quantity must be number only
- Total must be number only
- Ignore headers
- Ignore summaries
- Ignore grand totals
- Ignore profit rows
- Ignore dates
- Ignore row numbers
- One product per line
- Do not explain anything
-  If uncertain, skip the row

EXAMPLE:
MAHARAGE NJANO | 20 | 46000
DAGAA | 3 | 27000
MCHELE | 100 | 220000
`;

// 🔥 core OCR processor
 const fs = require("fs/promises");
 

const processOCR = async (file) => {
  if (process.env.NODE_ENV !== "production") {
    console.log("📂 FILE CHECK:", {
      hasFile: !!file,
      hasBuffer: !!file?.buffer,
      hasPath: !!file?.path,
      mimetype: file?.mimetype,
      size: file?.size,
    });
  }
  if (!file) {
  throw new Error("No file provided");
}

if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    "OCR service not configured"
  );
}

if (file.size && file.size > 5 * 1024 * 1024) {
  throw new Error("Image too large (max 5MB)");
}
let imageBase64;

// ✅ kama buffer ipo
if (file.buffer) {
  imageBase64 = file.buffer.toString("base64");
}

// ✅ fallback kama buffer haipo
 else if (file.path) {
  const fileData =
    await fs.readFile(file.path);

  imageBase64 =
    fileData.toString("base64");
}
// ❌ hakuna valid file
else {
  if (process.env.NODE_ENV !== "production") {
  console.log("⚠️ File object:", file);
}
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
        
     if (process.env.NODE_ENV !== "production") {
       console.log(
        `➡️ OCR | model=${model} | attempt=${attempt + 1}`
       );
      }
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
                        mime_type: file.mimetype?.startsWith("image/")
                           ? file.mimetype
                        : "image/jpeg",
                        data: imageBase64,
                      },
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0,
                 maxOutputTokens: 1200
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

const validLine =
  text
    .split("\n")
    .some((line) =>
       /^[^|]+\|\s*\d+\s*\|\s*\d+\s*$/.test(
        line.trim()
      )
    );

if (!validLine) {
  throw new Error(
    "Invalid OCR format"
  );
}

          if (process.env.NODE_ENV !== "production") {
            console.log("✅ OCR success");
       }
         if (process.env.NODE_ENV !== "production") {
          console.log("🧾 RAW OCR:\n", text);
        }

        return text
          .replace(/\r/g, "")
          .replace(/\n{2,}/g, "\n")
          .replace(/[ ]{2,}/g, " ")
          .trim();

      } catch (error) {
        const status =
          error.response?.status;

        if (process.env.NODE_ENV !== "production") {
          console.log("❌ OCR fail:", {
          model,
          attempt,
          status,
          message: error.message,
       });
     }

        // 🔥 retry only for overload / timeout
 const retryable =
  [429, 500, 502, 503, 504];

if (
  (retryable.includes(status) ||
    error.code === "ECONNABORTED") &&
  attempt < 2
        ) {
          const wait =
            2000 * (attempt + 1);

         if (process.env.NODE_ENV !== "production") {
  console.log(
    `⏳ retry in ${wait}ms`
  );
}

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
