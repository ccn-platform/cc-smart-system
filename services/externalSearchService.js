const OpenAI =
  require("openai");

const {
  GoogleGenerativeAI
} = require(
  "@google/generative-ai"
);

const openai =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY
  });

const gemini =
  new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
  );

const searchWithOpenAI =
  async (query) => {
    try {
      const response =
        await openai.responses.create(
          {
            model:
              process.env.OPENAI_WEB_MODEL ||
              "gpt-4o",

            tools: [
              {
                type:
                  "web_search_preview"
              }
            ],

            input:
              query
          }
        );

      return {
        provider:
          "openai",
        result:
          response.output_text ||
          "No web results"
      };

    } catch (error) {
      throw error;
    }
  };

const searchWithGemini =
  async (query) => {
    try {
      const model =
        gemini.getGenerativeModel(
          {
            model:
              process.env.GEMINI_MODEL ||
              "gemini-1.5-pro"
          }
        );

      const result =
        await model.generateContent(
          `
Use grounded current web knowledge.

Search and answer:

${query}
        `
        );

      const text =
        result.response.text();

      return {
        provider:
          "gemini",
        result:
          text
      };

    } catch (error) {
      throw error;
    }
  };

const externalWebSearch =
  async (query) => {
    try {
      return await searchWithOpenAI(
        query
      );

    } catch (error) {
      console.log(
        "OPENAI WEB FAILED:",
        error.message
      );

      return await searchWithGemini(
        query
      );
    }
  };

module.exports = {
  externalWebSearch
};
