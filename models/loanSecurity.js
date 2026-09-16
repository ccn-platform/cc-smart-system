 // models/loanSecurity.js
const mongoose = require("mongoose");

const loanSecuritySchema = new mongoose.Schema(
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

    loanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DebtLoan",
      default: null,
      index: true,
    },

    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanApplication",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: ["guarantor", "collateral"],
      required: true,
    },

    // Taarifa za mdhamini
    guarantor: {
      name: {
        type: String,
        trim: true,
        default: "",
      },
      phone: {
        type: String,
        trim: true,
        default: "",
      },
      relationship: {
        type: String,
        trim: true,
        default: "",
      },
      location: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // Taarifa za dhamana
    collateral: {
      type: {
        type: String,
        trim: true,
        default: "",
      },
      description: {
        type: String,
        trim: true,
        default: "",
      },
      estimatedValue: {
        type: Number,
        min: 0,
        default: null,
      },
      currency: {
        type: String,
        trim: true,
        default: "TZS",
      },
    },

    status: {
      type: String,
      enum: ["active", "released"],
      default: "active",
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    deletedAt: {
      type: Date,
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

loanSecuritySchema.pre("validate", function () {
  const hasLoanId = Boolean(this.loanId);
  const hasApplicationId = Boolean(this.applicationId);

  // Lazima iunganishwe na loanId au applicationId, lakini si vyote.
  if (hasLoanId === hasApplicationId) {
    this.invalidate(
      "loanId",
      "LoanSecurity lazima iunganishwe na loanId au applicationId pekee."
    );
  }

  if (this.type === "guarantor") {
    if (!this.guarantor?.name?.trim()) {
      this.invalidate(
        "guarantor.name",
        "Jina la mdhamini linahitajika."
      );
    }

    if (!this.guarantor?.phone?.trim()) {
      this.invalidate(
        "guarantor.phone",
        "Simu ya mdhamini inahitajika."
      );
    }
  }

  if (this.type === "collateral") {
    if (!this.collateral?.type?.trim()) {
      this.invalidate(
        "collateral.type",
        "Aina ya dhamana inahitajika."
      );
    }
  }
});

loanSecuritySchema.index({
  owner: 1,
  loanId: 1,
  deletedAt: 1,
});

loanSecuritySchema.index({
  owner: 1,
  applicationId: 1,
  deletedAt: 1,
});

module.exports = mongoose.model("LoanSecurity", loanSecuritySchema);
