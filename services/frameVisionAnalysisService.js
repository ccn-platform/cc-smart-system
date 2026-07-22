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
Wewe ni mkaguzi mtaalamu wa maduka ya rejareja Tanzania.

Chambua picha hii ya duka kwa umakini mkubwa.

Angalia:

- Mchele
- Unga
- Sukari
- Mafuta ya kupikia
- Sabuni
- Vinywaji
- Maji ya chupa
- Bidhaa za dukani
- Rafu
- Makreti
- Katoni
- Magunia
- Mpangilio wa bidhaa
- Usafi wa mazingira

USIDHANIE kuwa bidhaa hazipo kwa sababu zimewekwa chini.

Maduka mengi Tanzania hupanga bidhaa:

- Kwenye rafu
- Kwenye magunia
- Kwenye katoni
- Kwenye makreti
- Kwa kuzipanga juu kwa juu

Kadiria:

 Kadiria:

1. visibleProducts
2. visibleShelves
3. shelfFillPercent
4. estimatedInventoryValueTZS
5. estimatedLossValueTZS
6. riskScore
7. storeType
8. layoutDescription

MUHTASARI UWE KWA KISWAHILI.

Risk Score:
0-20 = Hatari ndogo
21-50 = Hatari ya wastani
51-100 = Hatari kubwa

Rudisha JSON PEKEE.

Mfano:

 {
  "visibleProducts":180,
  "visibleShelves":12,
  "shelfFillPercent":82,
  "estimatedInventoryValueTZS":3500000,
  "estimatedLossValueTZS":120000,
  "riskScore":18,
  "storeType":"Duka la vyakula",
  "layoutDescription":"Rafu 4 mbele, freezer 1, eneo la vinywaji upande wa kushoto",
  "summary":"Duka linaonekana kuwa na bidhaa nyingi, limepangwa vizuri na lina kiwango kidogo cha hatari."
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
        "Hakuna majibu kutoka Gemini"
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
          "Hakuna fremu zilizopatikana kwa uchambuzi."
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
          "Uchambuzi wa picha umeshindikana."
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
    avg("visibleProducts"),

  visibleShelves:
    avg("visibleShelves"),

  shelfFillPercent:
    avg("shelfFillPercent"),

  estimatedInventoryValue:
    avg("estimatedInventoryValueTZS"),

  estimatedLossValue:
    avg("estimatedLossValueTZS"),

  riskScore:
    avg("riskScore"),

  storeType:
    results[0]?.storeType ||
    "Haijajulikana",

  layoutDescription:
    results[0]?.layoutDescription ||
    "Haijajulikana",

  summary:
    results[0]?.summary ||
    "Uchambuzi umekamilika."
};
 
  };

module.exports = {
  analyzeFrames
};
