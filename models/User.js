 const mongoose = require("mongoose");

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
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
