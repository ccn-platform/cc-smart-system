  const axios = require("axios");
const http = require("http");
const https = require("https");
const fs = require("fs/promises");
const pLimit = require("p-limit").default;

const limit = pLimit(10);

const delay = (ms) =>
  new Promise((res) =>
    setTimeout(res, ms)
  );

const MODELS = [
  "gemini-2.5-flash",
  "gemini-1.5-flash"
];

const httpClient = axios.create({
  timeout: 20000,

  httpAgent: new http.Agent({
    keepAlive: true,
    maxSockets: 100
  }),

  httpsAgent: new https.Agent({
    keepAlive: true,
    maxSockets: 100
  }),

  maxContentLength:
    10 * 1024 * 1024,

  maxBodyLength:
    10 * 1024 * 1024
});

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
- If uncertain, still return best guess

EXAMPLE:
MAHARAGE NJANO | 20 | 46000
DAGAA | 3 | 27000
MCHELE | 100 | 220000
`;

const DEBT_PROMPT = `
You are an OCR engine for handwritten debt books.

Read ALL visible debt rows.

Return ONLY valid rows.

FORMAT:
NAME | AMOUNT | DAYS

RULES:
- Keep customer names exactly as written
- Amount must be number only
- Days must be number only
- Ignore dates
- Ignore titles
- Ignore notes
- Ignore totals
- One customer per line
- Do not explain anything

EXAMPLE:
JUMA | 50000 | 30
SAIDI | 20000 | 14
`;

const cleanupTempFile = async (
  filePath
) => {
  if (!filePath) return;

  try {
    await fs.unlink(filePath);
  } catch {
    // ignore cleanup errors
  }
};

 const processOCR = async (
  file,
  prompt
) => {
  if (!file) {
    throw new Error(
      "No file provided"
    );
  }

  if (
    file.size &&
    file.size >
      5 * 1024 * 1024
  ) {
    throw new Error(
      "Image too large (max 5MB)"
    );
  }

  let imageBase64;

  try {
    if (file.buffer) {
      imageBase64 =
        file.buffer.toString(
          "base64"
        );
    } else if (file.path) {
      const fileData =
        await fs.readFile(
          file.path
        );

      imageBase64 =
        fileData.toString(
          "base64"
        );
    } else {
      throw new Error(
        "Invalid file (no buffer/path)"
      );
    }

    for (
      let m = 0;
      m < MODELS.length;
      m++
    ) {
      const model =
        MODELS[m];

      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      for (
        let attempt = 0;
        attempt < 3;
        attempt++
      ) {
        try {
          const response =
            await httpClient.post(
              url,
              {
                contents: [
                  {
                    parts: [
                     {
                       text: prompt
                     },
                      {
                        inline_data:
                          {
                            mime_type:
                              file.mimetype?.startsWith(
                                "image/"
                              )
                                ? file.mimetype
                                : "image/jpeg",

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
                    maxOutputTokens:
                      4096
                  }
              },
              {
                headers: {
                  "x-goog-api-key":
                    process.env.GEMINI_API_KEY
                }
              }
            );

          const text =
            response.data
              ?.candidates?.[0]
              ?.content
              ?.parts?.[0]
              ?.text;

          if (
            !text ||
            text.length < 10
          ) {
            throw new Error(
              "Empty OCR response"
            );
          }

          return text
            .replace(/\r/g, "")
            .replace(
              /\n{2,}/g,
              "\n"
            )
            .replace(
              /[ ]{2,}/g,
              " "
            )
            .trim();
        } catch (error) {
          const status =
            error.response
              ?.status;

          if (
            (
              status === 429 ||
              status === 503 ||
              error.code ===
                "ECONNABORTED"
            ) &&
            attempt < 2
          ) {
            await delay(
              1500 *
                (attempt + 1)
            );

            continue;
          }

          break;
        }
      }
    }

    throw new Error(
      "OCR failed after retries"
    );
  } finally {
    if (file.path) {
      await cleanupTempFile(
        file.path
      );
    }
  }
};

 const readImageText = (
  file
) =>
  limit(() =>
    processOCR(
      file,
      PROMPT
    )
  );

  const readDebtImage = (
  file
) =>
  limit(() =>
    processOCR(
      file,
      DEBT_PROMPT
    )
  );
 module.exports = {
  readImageText,
  readDebtImage
};
