  const mongoose = require("mongoose");

 // 🔥 SUBSCRIPTION SCHEMA (inajitegemea)
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
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 🔥 wiki 2 bure
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
    
    mkoa: {
      type: String,
      required: true
    },

    wilaya: {
      type: String,
      required: true
    },

    mtaa: {
      type: String,
      required: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

   role: {
  type: String,
  default: "owner"
},

subscription: {
  type: subscriptionSchema,
  default: () => ({})
},
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
