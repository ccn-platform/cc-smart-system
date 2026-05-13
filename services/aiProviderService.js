 const {
  sendWithOpenAI
} = require(
  "./providers/openaiProvider"
);

const sendToAI =
  async ({
    provider = "openai",
    message,
    language = "auto",
    ownerId,
    branchId,
    user,
    conversation = []
  }) => {
    try {
      if (
        !message ||
        !message.trim()
      ) {
        throw new Error(
          "Message required"
        );
      }

      const payload = {
        message:
          message.trim(),
        language,
        ownerId,
        branchId,
        user,
        conversation
      };

      // DIRECT GEMINI
      if (
        provider === "gemini"
      ) {
        const {
          sendWithGemini
        } = require(
          "./providers/geminiProvider"
        );

        return await sendWithGemini(
          payload
        );
      }

      // OPENAI PRIMARY
      return await sendWithOpenAI(
        payload
      );

    } catch (error) {
      console.log(
        "AI PROVIDER ERROR:",
        error.message
      );

      // FALLBACK OPENAI -> GEMINI
      if (
        provider === "openai"
      ) {
        try {
          const {
            sendWithGemini
          } = require(
            "./providers/geminiProvider"
          );

          return await sendWithGemini({
            message:
              message.trim(),
            language,
            ownerId,
            branchId,
            user,
            conversation
          });

        } catch (
          fallbackError
        ) {
          console.log(
            "GEMINI FALLBACK ERROR:",
            fallbackError.message
          );
        }
      }

      throw new Error(
        error.message ||
          "AI provider failed"
      );
    }
  };

module.exports = {
  sendToAI
};
