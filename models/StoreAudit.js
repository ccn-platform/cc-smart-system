  const mongoose =
  require("mongoose");

const findingSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        default: ""
      },

      value: {
        type: String,
        default: ""
      },

      confidence: {
        type: Number,
        default: 0
      }
    },
    {
      _id: false
    }
  );

const storeAuditSchema =
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

      shop: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true,
        index: true
      },

      videoUrl: {
        type: String,
        required: true
      },

      status: {
        type: String,
        enum: [
          "pending",
          "processing",
          "completed",
          "failed"
        ],
        default: "pending",
        index: true
      },

      summary: {
        type: String,
        default: ""
      },

      findings: {
        type: [findingSchema],
        default: []
      },

      // AI CONFIDENCE
      confidenceScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },

      // INVENTORY ESTIMATION
      estimatedInventoryValue: {
        type: Number,
        default: 0
      },

      estimatedLossValue: {
        type: Number,
        default: 0
      },

      // STORE HEALTH
      riskScore: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
      },

      // ANALYSIS
      analyzedAt: {
        type: Date,
        default: null
      },

      analysisVersion: {
        type: String,
        default: "1.0"
      },

      processingError: {
        type: String,
        default: ""
      }
    },
    {
      timestamps: true
    }
  );

storeAuditSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1
});

storeAuditSchema.index({
  shop: 1,
  createdAt: -1
});

module.exports =
  mongoose.model(
    "StoreAudit",
    storeAuditSchema
  );
