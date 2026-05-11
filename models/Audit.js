  const mongoose =
  require("mongoose");


// AUDIT ITEM
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
    {
      _id: false
    }
  );


// MAIN AUDIT
const auditSchema =
  new mongoose.Schema(
    {
      owner: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },

      branch: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true
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
      timestamps: true,
      minimize: true
    }
  );


// INDEXES
auditSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1
});

auditSchema.index({
  owner: 1,
  branch: 1,
  status: 1
});

auditSchema.index({
  owner: 1,
  branch: 1,
  createdBy: 1
});

module.exports =
  mongoose.model(
    "Audit",
    auditSchema
  );
