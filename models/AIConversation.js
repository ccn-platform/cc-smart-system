const mongoose =
  require("mongoose");

const messageSchema =
  new mongoose.Schema(
    {
      role: {
        type: String,
        enum: [
          "user",
          "assistant",
          "tool"
        ],
        required: true
      },

      content: {
        type: String,
        required: true,
        trim: true
      },

      toolName: {
        type: String,
        default: null
      },

      metadata: {
        type:
          mongoose.Schema.Types.Mixed,
        default: {}
      },

      createdAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      _id: false
    }
  );

const aiConversationSchema =
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
        default:
          "openai"
      },

     language: {
      type: String,
      default: "auto"
     },

      messages: [
        messageSchema
      ],

      lastUsedAt: {
        type: Date,
        default: Date.now
      }
    },
    {
      timestamps: true
    }
  );


// ONE CONVERSATION PER OWNER+BRANCH+USER
aiConversationSchema.index(
  {
    owner: 1,
    branch: 1,
    user: 1
  },
  {
    unique: true
  }
);


// FAST LOOKUPS
aiConversationSchema.index({
  owner: 1,
  branch: 1,
  lastUsedAt: -1
});

module.exports =
  mongoose.model(
    "AIConversation",
    aiConversationSchema
  );
