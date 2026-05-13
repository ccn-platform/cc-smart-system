 const mongoose =
  require("mongoose");

const aiUsageSchema =
  new mongoose.Schema(
    {
      owner: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      branch: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true
      },

      user: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      provider: {
        type: String,
        enum: [
          "openai",
          "gemini"
        ],
        required: true
      },

      model: {
        type: String,
        default: ""
      },

       language: {
        type: String,
         default: "auto"
        },

      userMessage: {
        type: String,
        required: true,
        trim: true
      },

      assistantMessage: {
        type: String,
        required: true,
        trim: true
      },

      toolsUsed: [
        {
          type: String
        }
      ],

      promptTokens: {
        type: Number,
        default: 0
      },

      completionTokens: {
        type: Number,
        default: 0
      },

      totalTokens: {
        type: Number,
        default: 0
      },

      estimatedCost: {
        type: Number,
        default: 0
      }
    },
    {
      timestamps: true
    }
  );


// FAST FILTERS
aiUsageSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1
});

aiUsageSchema.index({
  owner: 1,
  provider: 1,
  createdAt: -1
});

module.exports =
  mongoose.model(
    "AIUsage",
    aiUsageSchema
  );
