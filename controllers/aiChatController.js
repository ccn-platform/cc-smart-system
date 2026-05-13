 const AIConversation =
  require("../models/AIConversation");

const AIUsage =
  require("../models/AIUsage");

const {
  detectLanguage
} = require(
  "../utils/detectLanguage"
);

const {
  sendToAI
} = require(
  "../services/aiProviderService"
);


// CHAT
const chatWithAI =
  async (req, res) => {
    try {
      const {
        message,
        provider
      } = req.body;

      if (
        !message ||
        !message.trim()
      ) {
        return res.status(400).json({
          message:
            "Message required"
        });
      }

      const selectedProvider =
        provider === "gemini"
          ? "gemini"
          : "openai";

     const cleanMessage =
  message.trim();

const language =
  detectLanguage(
    cleanMessage
  );

      let conversation =
        await AIConversation.findOne({
          owner:
            req.ownerId,
          branch:
            req.branchId,
          user:
            req.user._id
        });

      if (!conversation) {
        conversation =
          await AIConversation.create({
            owner:
              req.ownerId,
            branch:
              req.branchId,
            user:
              req.user._id,
            provider:
              selectedProvider,
            language,
            messages: []
          });
      }
 

const history =
  conversation.messages.slice(
    -30
  );

const aiResult =
  await sendToAI({
    provider:
      selectedProvider,

    message:
      cleanMessage,

    language,

    ownerId:
      req.ownerId,

    branchId:
      req.branchId,

    user:
      req.user,

    conversation:
      history
  });

      conversation.messages.push(
  {
    role: "user",
    content:
      cleanMessage
  },
  {
    role:
      "assistant",
    content:
      aiResult.reply
  }
);

      conversation.provider =
  aiResult.provider ||
  selectedProvider;

      conversation.language =
        language;

      conversation.lastUsedAt =
        new Date();

      await conversation.save();

      await AIUsage.create({
        owner:
          req.ownerId,

        branch:
          req.branchId,

        user:
          req.user._id,

        provider:
  aiResult.provider ||
  selectedProvider,

        model:
          aiResult.model ||
          "",

        language,

         userMessage:
           cleanMessage,

        assistantMessage:
          aiResult.reply,

        toolsUsed:
          aiResult.toolsUsed ||
          [],

        promptTokens:
          aiResult.promptTokens ||
          0,

        completionTokens:
          aiResult.completionTokens ||
          0,

        totalTokens:
          aiResult.totalTokens ||
          0,

        estimatedCost:
          aiResult
            .estimatedCost ||
          0
      });

      return res.status(200).json({
        reply:
          aiResult.reply,

         provider:
  aiResult.provider ||
  selectedProvider,

        language,

        toolsUsed:
          aiResult.toolsUsed ||
          []
      });

    } catch (error) {
      console.log(
  "AI CHAT ERROR:",
  error.message
);

      return res.status(500).json({
        message:
          error.message ||
          "AI request failed"
      });
    }
  };


// HISTORY
const getConversationHistory =
  async (req, res) => {
    try {
      const conversation =
        await AIConversation.findOne({
          owner:
            req.ownerId,
          branch:
            req.branchId,
          user:
            req.user._id
        }).lean();

      if (!conversation) {
        return res.status(200).json(
          []
        );
      }

      return res.status(200).json(
        conversation.messages
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// CLEAR
const clearConversation =
  async (req, res) => {
    try {
      await AIConversation.findOneAndDelete(
        {
          owner:
            req.ownerId,
          branch:
            req.branchId,
          user:
            req.user._id
        }
      );

      return res.status(200).json({
        message:
          "Conversation cleared"
      });

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };

module.exports = {
  chatWithAI,
  getConversationHistory,
  clearConversation
};
