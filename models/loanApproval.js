 // models/loanApproval.js
const mongoose = require("mongoose");

const loanApprovalSchema = new mongoose.Schema(
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

    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanApplication",
      required: true,
      index: true,
    },

    decision: {
      type: String,
      enum: ["approved", "rejected"],
      required: true,
    },

    approvedAmount: {
      type: Number,
      min: 1,
      default: null,
    },

    approvedTermDays: {
      type: Number,
      min: 1,
      default: null,
    },

    reason: {
      type: String,
      trim: true,
      default: "",
    },

    decidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    decidedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    // Huunganishwa baada ya DebtLoan kuundwa
    resultingLoanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DebtLoan",
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

loanApprovalSchema.pre("validate", function () {
  if (this.decision === "approved") {
    if (!Number.isFinite(this.approvedAmount) || this.approvedAmount <= 0) {
      this.invalidate(
        "approvedAmount",
        "Kiasi kilichoidhinishwa lazima kiwe zaidi ya sifuri."
      );
    }

    if (
      !Number.isInteger(this.approvedTermDays) ||
      this.approvedTermDays <= 0
    ) {
      this.invalidate(
        "approvedTermDays",
        "Muda ulioidhinishwa lazima uwe siku kamili zaidi ya sifuri."
      );
    }
  }
});

loanApprovalSchema.index({
  owner: 1,
  applicationId: 1,
  decidedAt: -1,
});

module.exports = mongoose.model("LoanApproval", loanApprovalSchema);
