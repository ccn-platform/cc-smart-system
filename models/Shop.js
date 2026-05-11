 const mongoose = require("mongoose");

const shopSchema = new mongoose.Schema(
  {
  owner: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: true,
  unique: true,
  index: true
},

    businessName: {
      type: String,
      required: true,
      trim: true
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessCategory"
    },

    phone: {
      type: String,
      default: ""
    },

    email: {
      type: String,
      default: ""
    },

    mkoa: String,
    wilaya: String,
    mtaa: String,

    logo: {
      type: String,
      default: ""
    },

    currency: {
      type: String,
      default: "TZS"
    },

    taxPercent: {
      type: Number,
      default: 0
    },

    receiptFooter: {
      type: String,
      default: "Thank you"
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.model(
    "Shop",
    shopSchema
  );
