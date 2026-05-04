  const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema({
  plan: {
    type: String,
    enum: ["trial", "weekly", "monthly", "six_months", "yearly"],
    default: "trial"
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () =>
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    businessName: {
      type: String,
      required: true,
      trim: true
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    businessCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessCategory",
      required: true
    },

    mkoa: String,
    wilaya: String,
    mtaa: String,

    isActive: {
      type: Boolean,
      default: true
    },

    role: {
      type: String,
      enum: ["owner", "staff"],
      default: "owner"
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },

    subscription: {
      type: subscriptionSchema,
      default: function () {
        return this.role === "owner" ? {} : undefined;
      }
    },

    pendingPlan: {
      type: String,
      enum: ["weekly", "monthly", "six_months", "yearly"],
      default: null
    },

    paymentReference: {
      type: String,
      default: null
    },

    pendingExpiresAt: {
      type: Date,
      default: null
    }
  },
  { timestamps: true }
);

// 🔥 VALIDATION
 userSchema.pre("save", async function () {
  // 🔥 only run on NEW document
  if (this.isNew) {

    if (this.role === "staff" && !this.owner) {
      throw new Error("Staff must have owner");
    }

    if (this.role === "owner" && this.owner) {
      throw new Error("Owner cannot have owner");
    }

  }
});

module.exports = mongoose.model("User", userSchema);
