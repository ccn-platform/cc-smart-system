const mongoose =
require("mongoose");

const debtPaymentSchema =
new mongoose.Schema(
  {
    loan: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "DebtLoan",
      required: true,
      index: true
    },

    customer: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref:
        "CustomerIdentity",
      required: true
    },

    user: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    branch: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null
    },

    amount: {
      type: Number,
      required: true,
      min: 1
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

    reference: {
      type: String,
      default: "",
      trim: true
    },

    note: {
      type: String,
      default: ""
    },

    receivedBy: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    status: {
      type: String,
      enum: [
        "posted",
        "reversed"
      ],
      default:
        "posted"
    }
  },
  {
    timestamps: true
  }
);

module.exports =
mongoose.model(
  "DebtPayment",
  debtPaymentSchema
);