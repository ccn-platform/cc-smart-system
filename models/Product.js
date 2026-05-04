  const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    // 🔥 BADILISHA HAPA
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      default: null
    },

    name: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    aliases: [
      {
        type: String,
        trim: true
      }
    ],

    barcode: {
      type: String,
      default: "",
      trim: true,
      index: true
    },

    category: {
      type: String,
      default: "General",
      trim: true,
      index: true
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
      min: 0,
      index: true
    },

    lowStockAlert: {
      type: Number,
      default: 5
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    minimize: true
  }
);

// 🔥 INDEXES
productSchema.index({ owner: 1, name: 1 });
productSchema.index({ owner: 1, barcode: 1 });
productSchema.index({ owner: 1, createdAt: -1 });

// 🔥 TEXT SEARCH
productSchema.index({
  name: "text",
  aliases: "text",
  category: "text"
});

module.exports = mongoose.model("Product", productSchema);
