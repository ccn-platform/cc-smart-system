 const {
  GoogleGenerativeAI
} = require(
  "@google/generative-ai"
);

const {
  getBusinessTools,
  executeBusinessTool
} = require(
  "../../tools/getBusinessTools"
);

const {
  buildSystemPrompt
} = require(
  "../../services/promptService"
);

const genAI =
  new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
  );

const sendWithGemini =
  async ({
    message,
    language = "auto",
    ownerId,
    branchId,
    user,
    conversation = []
  }) => {
    try {
      const model =
        genAI.getGenerativeModel(
          {
            model:
              process.env.GEMINI_MODEL ||
              "gemini-1.5-pro"
          }
        );

      const tools =
        getBusinessTools();

      const systemPrompt =
        buildSystemPrompt({
          language,
          user
        });

      const history =
        conversation
          .filter(
            (msg) =>
              msg.role ===
                "user" ||
              msg.role ===
                "assistant"
          )
          .map((msg) => ({
            role:
              msg.role ===
              "assistant"
                ? "model"
                : "user",

            parts: [
              {
                text:
                  msg.content
              }
            ]
          }));
const chat =
  model.startChat({
    history,
    systemInstruction: {
      role: "system",
      parts: [
        {
          text:
            systemPrompt
        }
      ]
    }
  });
      
      let result =
        await chat.sendMessage(
          message
        );

      let response =
        result.response;

      const toolsUsed =
        [];

      let loopGuard = 0;
      const MAX_LOOPS = 5;

      while (
        response
          ?.functionCalls &&
        response.functionCalls()
          ?.length &&
        loopGuard <
          MAX_LOOPS
      ) {
        loopGuard++;

        for (const call of response.functionCalls()) {
          const toolName =
            call.name;

          const args =
            call.args || {};

          const toolResult =
            await executeBusinessTool(
              toolName,
              {
                ownerId,
                branchId,
                args
              }
            );

          toolsUsed.push(
            toolName
          );

          result =
            await chat.sendMessage(
              JSON.stringify(
                toolResult
              )
            );

          response =
            result.response;
        }
      }

      return {
        reply:
          response.text() ||
          "No response",

        provider:
          "gemini",

        model:
          process.env.GEMINI_MODEL ||
          "gemini-1.5-pro",

        toolsUsed:
          [
            ...new Set(
              toolsUsed
            )
          ],

        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        estimatedCost: 0
      };

    } catch (error) {
      console.log(
        "GEMINI ERROR:",
        error.message
      );

      throw error;
    }
  };

module.exports = {
  sendWithGemini
};
