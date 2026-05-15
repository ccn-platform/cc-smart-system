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

 // 🔥 ULTRA STRICT OCR PROMPT
const PROMPT = `
You are a STRICT OCR extraction engine for Tanzanian shop invoices, receipts, and handwritten order sheets.

MISSION:
Extract EVERY visible product row from the image with maximum completeness.

CRITICAL FAILURE CONDITIONS:
Your answer is WRONG if:
- even ONE visible product row is missing
- spelling is changed
- rows are merged
- rows are skipped
- values are invented

READING INSTRUCTIONS:
- Read image from TOP to BOTTOM
- Read LEFT to RIGHT
- Process rows ONE BY ONE sequentially
- Continue until the LAST visible row
- Do NOT stop early
- Do NOT shorten output

OUTPUT FORMAT:
PRODUCT_NAME | QTY | TOTAL

STRICT RULES:
- Return ONLY product rows
- One row per line
- Preserve exact original spelling
- Preserve exact capitalization
- Preserve abbreviations exactly
- Preserve brand names exactly
- Preserve handwritten spelling mistakes exactly
- DO NOT autocorrect
- DO NOT summarize
- DO NOT explain
- DO NOT merge rows
- DO NOT skip rows
- DO NOT invent hidden text
- DO NOT guess invisible values

PRODUCT_NAME:
- Copy exactly as visible
- If partially unreadable:
  keep readable text + [UNCLEAR]

QTY:
- Number only
- If unreadable:
  [UNCLEAR]

TOTAL:
- Number only
- No commas
- No currency symbols
- If unreadable:
  [UNCLEAR]

IGNORE COMPLETELY:
- shop name
- headers
- dates
- phone numbers
- addresses
- receipt numbers
- totals
- subtotals
- grand totals
- profit rows
- footer text
- signatures

SELF-CHECK BEFORE RESPONDING:
1. Count visible product rows in image
2. Count output rows
3. If counts do not match, re-read image
4. Ensure bottom-most row is included
5. Ensure no visible row was skipped

FINAL RESPONSE:
Only rows in this exact format:
PRODUCT_NAME | QTY | TOTAL

EXAMPLE:
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
