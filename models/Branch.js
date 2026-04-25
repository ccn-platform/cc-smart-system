const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true
    },

    name: {
      type: String,
      required: true
    },

    phone: {
      type: String,
      default: ""
    },

    manager: {
      type: String,
      default: ""
    },

    mkoa: String,
    wilaya: String,
    mtaa: String,

    isMain: {
      type: Boolean,
      default: false
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
    "Branch",
    branchSchema
  );