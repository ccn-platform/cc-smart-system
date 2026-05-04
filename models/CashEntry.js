 const mongoose =
require("mongoose");

const cashEntrySchema =
new mongoose.Schema(
  {
     owner: {
       type: mongoose.Schema.Types.ObjectId,
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

    type: {
      type: String,
      enum: [
        "income",
        "expense"
      ],
      required: true
    },

    category: {
      type: String,
      required: true,
      trim: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    paymentMethod: {
      type: String,
      enum: [
        "cash",
        "bank",
        "mobile_money",
        "mixed"
      ],
      default:
        "cash"
    },

    source: {
      type: String,
      enum: [
        "manual",
        "pos",
        "system"
      ],
      default:
        "manual"
    },

    reference: {
      type: String,
      default: "",
      trim: true
    },

    note: {
      type: String,
      default: ""
    },

    createdBy: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    },

    status: {
      type: String,
      enum: [
        "active",
        "void"
      ],
      default:
        "active"
    }
  },
  {
    timestamps: true
  }
);

module.exports =
mongoose.model(
  "CashEntry",
  cashEntrySchema
);
