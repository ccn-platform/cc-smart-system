const mongoose =
require("mongoose");

const debtLoanSchema =
new mongoose.Schema(
  {
    customer: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref:
        "CustomerIdentity",
      required: true,
      index: true
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

    businessCategory: {
      type: String,
      default: "",
      index: true
    },

    loanNumber: {
      type: String,
      unique: true
    },

    principalAmount: {
      type: Number,
      required: true
    },

    balanceAmount: {
      type: Number,
      required: true
    },

    paidAmount: {
      type: Number,
      default: 0
    },

    dueDate: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: [
        "active",
        "paid",
        "overdue",
        "defaulted",
        "cancelled"
      ],
      default:
        "active"
    },

    items: [
      {
        name: String,
        qty: Number,
        price: Number
      }
    ],

    note: {
      type: String,
      default: ""
    },

    approvedBy: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports =
mongoose.model(
  "DebtLoan",
  debtLoanSchema
);