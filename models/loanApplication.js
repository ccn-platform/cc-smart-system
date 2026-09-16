 // models/loanApplication.js
const mongoose = require("mongoose");

const loanApplicationSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null,
      index: true,
    },

    // Taarifa za mteja wakati ombi linapowasilishwa
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerIdentity",
      default: null,
      index: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      trim: true,
      default: "",
    },

    requestedAmount: {
      type: Number,
      required: true,
      min: 1,
    },

    requestedTermDays: {
      type: Number,
      required: true,
      min: 1,
    },

    purpose: {
      type: String,
      trim: true,
      default: "",
    },

    // Hali ya mchakato wa ombi
    status: {
      type: String,
      enum: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
        "cancelled",
        "converted",
      ],
      default: "draft",
      index: true,
    },

    submittedAt: {
      type: Date,
      default: null,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Huunganishwa baada ya kuundwa kwa DebtLoan
    resultingLoanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DebtLoan",
      default: null,
      index: true,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

loanApplicationSchema.pre("validate", function () {
  if (this.status === "converted" && !this.resultingLoanId) {
    this.invalidate(
      "resultingLoanId",
      "Ombi lililogeuzwa kuwa mkopo lazima liwe na resultingLoanId."
    );
  }

  if (
    ["submitted", "under_review", "approved", "rejected", "converted"].includes(
      this.status
    ) &&
    !this.submittedAt
  ) {
    this.invalidate(
      "submittedAt",
      "submittedAt inahitajika kwa ombi lililowasilishwa."
    );
  }
});

loanApplicationSchema.index({
  owner: 1,
  status: 1,
  createdAt: -1,
});

loanApplicationSchema.index({
  owner: 1,
  customerId: 1,
  createdAt: -1,
});

module.exports = mongoose.model(
  "LoanApplication",
  loanApplicationSchema
);
