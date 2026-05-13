 const OpenAI =
  require("openai");

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

const client =
  new OpenAI({
    apiKey:
      process.env.OPENAI_API_KEY
  });

const sendWithOpenAI =
  async ({
    message,
    language = "auto",
    ownerId,
    branchId,
    user,
    conversation = []
  }) => {
    try {
      const tools =
        getBusinessTools();

      const systemPrompt =
        buildSystemPrompt({
          language,
          user
        });

      const messages = [
        {
          role: "system",
          content:
            systemPrompt
        },

        ...conversation
          .filter(
            (msg) =>
              msg.role ===
                "user" ||
              msg.role ===
                "assistant"
          )
          .map((msg) => ({
            role:
              msg.role,
            content:
              msg.content
          })),

        {
          role: "user",
          content:
            message
        }
      ];

      let response =
        await client.chat.completions.create(
          {
            model:
              process.env.OPENAI_MODEL ||
              "gpt-4o-mini",

            messages,

            tools,

            tool_choice:
              "auto",

            temperature:
              0.7
          }
        );

      let assistantMessage =
        response.choices[0]
          .message;

      const toolsUsed =
        [];

      let loopGuard = 0;
      const MAX_LOOPS = 5;

      while (
        assistantMessage
          ?.tool_calls?.length &&
        loopGuard <
          MAX_LOOPS
      ) {
        loopGuard++;

        messages.push({
          role:
            "assistant",
          content:
            assistantMessage.content ||
            "",
          tool_calls:
            assistantMessage.tool_calls
        });

        for (const toolCall of assistantMessage.tool_calls) {
          const toolName =
            toolCall.function
              .name;

          let args = {};

          try {
            args =
              JSON.parse(
                toolCall.function
                  .arguments ||
                  "{}"
              );
          } catch {
            args = {};
          }

          const result =
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

          messages.push({
            role: "tool",
            tool_call_id:
              toolCall.id,
            content:
              JSON.stringify(
                result
              )
          });
        }

        response =
          await client.chat.completions.create(
            {
              model:
                process.env.OPENAI_MODEL ||
                "gpt-4o-mini",

              messages,

              tools,

              tool_choice:
                "auto",

              temperature:
                0.7
            }
          );

        assistantMessage =
          response.choices[0]
            .message;
      }

      return {
        reply:
          assistantMessage
            ?.content ||
          "No response",

        provider:
          "openai",

        model:
          response.model,

        toolsUsed:
          [
            ...new Set(
              toolsUsed
            )
          ],

        promptTokens:
          response.usage
            ?.prompt_tokens || 0,

        completionTokens:
          response.usage
            ?.completion_tokens || 0,

        totalTokens:
          response.usage
            ?.total_tokens || 0,

        estimatedCost: 0
      };

    } catch (error) {
      console.log(
        "OPENAI ERROR:",
        error.message
      );

      throw error;
    }
  };

module.exports = { 
  sendWithOpenAI
};
