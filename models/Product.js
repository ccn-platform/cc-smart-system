  const mongoose =
require("mongoose");

const productSchema =
new mongoose.Schema(
  {
    user: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    branch: {
      type:
        mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    barcode: {
      type: String,
      default: "",
      trim: true,
      index: true
    },

    category: {
      type: String,
      default: "General",
      trim: true
    },

    unit: {
      type: String,
      default: "pcs",
      trim: true
    },

    description: {
      type: String,
      default: ""
    },

    image: {
      type: String,
      default: ""
    },

    buyPrice: {
      type: Number,
      default: 0
    },

    sellPrice: {
      type: Number,
      default: 0
    },

    stockQty: {
      type: Number,
      default: 0,
      min: 0
    },

    lowStockAlert: {
      type: Number,
      default: 5
    },

    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports =
mongoose.model(
  "Product",
  productSchema
);
