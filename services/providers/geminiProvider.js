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
     const MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-1.5-flash"
].filter(Boolean);

let model = null;
let activeModel = null;

for (const modelName of MODELS) {
  try {
    model =
      genAI.getGenerativeModel({
        model:
          modelName
      });

    activeModel =
      modelName;

    break;

  } catch (error) {
    console.log(
      "MODEL FAILED:",
      modelName
    );
  }
}

if (!model) {
  throw new Error(
    "No Gemini model available"
  );
}

       const tools =
  getBusinessTools({
    ownerId,
    branchId,
    user
  });

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
           activeModel,

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
