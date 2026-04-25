const mongoose =
require("mongoose");

const auditItemSchema =
new mongoose.Schema(
  {
    product: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null
    },

    name: {
      type: String,
      required: true,
      trim: true
    },

    systemQty: {
      type: Number,
      default: 0
    },

    countedQty: {
      type: Number,
      default: 0
    },

    difference: {
      type: Number,
      default: 0
    },

    buyPrice: {
      type: Number,
      default: 0
    },

    sellPrice: {
      type: Number,
      default: 0
    },

    lossValue: {
      type: Number,
      default: 0
    },

    gainValue: {
      type: Number,
      default: 0
    },

    note: {
      type: String,
      default: ""
    }
  },
  { _id: false }
);

const auditSchema =
new mongoose.Schema(
  {
    user: {
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
      default: null
    },

    method: {
      type: String,
      enum: [
        "manual",
        "camera"
      ],
      default:
        "manual"
    },

    status: {
      type: String,
      enum: [
        "draft",
        "completed"
      ],
      default:
        "completed"
    },

    items: [
      auditItemSchema
    ],

    totalItems: {
      type: Number,
      default: 0
    },

    shortageCount: {
      type: Number,
      default: 0
    },

    excessCount: {
      type: Number,
      default: 0
    },

    totalLossValue: {
      type: Number,
      default: 0
    },

    totalGainValue: {
      type: Number,
      default: 0
    },

    note: {
      type: String,
      default: ""
    }
  },
  {
    timestamps: true
  }
);

module.exports =
mongoose.model(
  "Audit",
  auditSchema
);