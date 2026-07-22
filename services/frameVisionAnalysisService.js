 const fs =
  require("fs/promises");

const axios =
  require("axios");

const http =
  require("http");

const https =
  require("https");

const httpClient =
  axios.create({
    timeout: 30000,

    httpAgent:
      new http.Agent({
        keepAlive: true
      }),

    httpsAgent:
      new https.Agent({
        keepAlive: true
      })
  });

const MODEL =
  "gemini-2.5-flash";

const VISION_PROMPT =
`
You are a retail store audit AI.

Analyze this image from a Tanzanian retail shop.

Estimate:

1. visibleProducts
2. visibleShelves
3. shelfFillPercent (0-100)
4. estimatedInventoryValueTZS
5. estimatedLossValueTZS
6. riskScore (0-100)

Return ONLY valid JSON.

Example:

{
  "visibleProducts":120,
  "visibleShelves":8,
  "shelfFillPercent":82,
  "estimatedInventoryValueTZS":2500000,
  "estimatedLossValueTZS":150000,
  "riskScore":12,
  "summary":"Store appears well stocked with low risk."
}
`;

const analyzeSingleFrame =
  async (
    framePath
  ) => {

    const image =
      await fs.readFile(
        framePath
      );

    const imageBase64 =
      image.toString(
        "base64"
      );

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

    const response =
      await httpClient.post(
        url,
        {
          contents: [
            {
              parts: [
                {
                  text:
                    VISION_PROMPT
                },
                {
                  inline_data: {
                    mime_type:
                      "image/jpeg",

                    data:
                      imageBase64
                  }
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0
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
        ?.content?.parts?.[0]
        ?.text;

    if (!text) {
      throw new Error(
        "Empty vision response"
      );
    }

    const clean =
      text
        .replace(
          /```json/g,
          ""
        )
        .replace(
          /```/g,
          ""
        )
        .trim();

    return JSON.parse(
      clean
    );
  };

const analyzeFrames =
  async (
    frames
  ) => {

    if (
      !frames ||
      !frames.length
    ) {
      return {
        visibleProducts: 0,
        visibleShelves: 0,
        shelfFillPercent: 0,
        estimatedInventoryValue: 0,
        estimatedLossValue: 0,
        riskScore: 100,
        summary:
          "No frames available."
      };
    }

    const sampleFrames =
      frames.slice(
        0,
        5
      );

    const results =
      [];

    for (
      const frame of sampleFrames
    ) {

      try {

        const result =
          await analyzeSingleFrame(
            frame
          );

        results.push(
          result
        );

      } catch (error) {

        console.error(
          "FRAME_VISION_ERROR:",
          error.message
        );
      }
    }

    if (
      !results.length
    ) {
      return {
        visibleProducts: 0,
        visibleShelves: 0,
        shelfFillPercent: 0,
        estimatedInventoryValue: 0,
        estimatedLossValue: 0,
        riskScore: 100,
        summary:
          "Analysis failed."
      };
    }

    const avg =
      (
        field
      ) =>
        Math.round(
          results.reduce(
            (
              sum,
              item
            ) =>
              sum +
              (
                Number(
                  item[
                    field
                  ]
                ) || 0
              ),
            0
          ) /
            results.length
        );

    return {
      visibleProducts:
        avg(
          "visibleProducts"
        ),

      visibleShelves:
        avg(
          "visibleShelves"
        ),

      shelfFillPercent:
        avg(
          "shelfFillPercent"
        ),

      estimatedInventoryValue:
        avg(
          "estimatedInventoryValueTZS"
        ),

      estimatedLossValue:
        avg(
          "estimatedLossValueTZS"
        ),

      riskScore:
        avg(
          "riskScore"
        ),

      summary:
        results[0]
          ?.summary ||
        "Analysis completed."
    };
  };

module.exports = {
  analyzeFrames
};
