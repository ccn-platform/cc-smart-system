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

 // 🔥 STRICT OCR PROMPT
const PROMPT = `
You are a STRICT OCR extraction engine for Tanzanian shop invoices, printed receipts, and handwritten order sheets.

YOUR JOB:
Copy visible text EXACTLY from the image.

OUTPUT FORMAT:
PRODUCT_NAME | QTY | TOTAL

STRICT RULES:
- Read EVERY visible product row
- Preserve original spelling exactly as written
- Preserve original capitalization exactly as written
- DO NOT correct spelling mistakes
- DO NOT guess missing letters
- DO NOT invent products
- DO NOT invent quantities
- DO NOT invent totals
- DO NOT summarize
- DO NOT explain anything
- DO NOT merge multiple rows
- One product per line only

FIELD RULES:
PRODUCT_NAME:
- Copy exactly as visible
- Keep abbreviations exactly
- Keep brand names exactly
- If partially unclear, keep readable part and use [UNCLEAR] for missing part

QTY:
- Number only
- No units
- No text
- If unclear, use [UNCLEAR]

TOTAL:
- Number only
- No currency symbols
- No commas
- If unclear, use [UNCLEAR]

IGNORE COMPLETELY:
- Invoice headers
- Shop names
- Dates
- Phone numbers
- Addresses
- Receipt numbers
- Grand totals
- Subtotals
- Profit rows
- Footer text
- Signatures
- Row numbering if not part of product name

IMPORTANT:
- Missing a visible product row is a serious error
- Guessing is a serious error
- Changing spelling is a serious error
- Return ALL visible product rows

VALID EXAMPLE:
MAHARAGE NJANO | 20 | 46000
DAGAA | 3 | 27000
MCHELE SUPER | 100 | 220000
COCA COLA | 24 | 36000
AZAM [UNCLEAR] | 12 | 18000
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
                 maxOutputTokens: 2000
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
