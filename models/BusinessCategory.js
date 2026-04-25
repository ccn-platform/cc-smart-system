const mongoose = require("mongoose");

const businessCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    isActive: {
      type: Boolean,
      default: true
    },

    sortOrder: {
      type: Number,
      default: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "BusinessCategory",
  businessCategorySchema
);