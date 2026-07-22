const mongoose = require("mongoose");

const storeAuditSchema =
  new mongoose.Schema(
    {
      owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true
      },

      shop: {
        type: mongoose.Schema.Types.ObjectId,
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
        default: "pending"
      },

      summary: {
        type: String,
        default: ""
      },

      findings: [
        {
          title: String,
          value: String
        }
      ]
    },
    {
      timestamps: true
    }
  );

module.exports =
  mongoose.model(
    "StoreAudit",
    storeAuditSchema
  );
