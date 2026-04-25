const mongoose = require("mongoose");

const saleSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product"
        },

        name: String,
        qty: Number,
        price: Number,
        buyPrice: Number,
        total: Number
      }
    ],

    totalAmount: {
      type: Number,
      required: true
    },

    totalProfit: {
      type: Number,
      default: 0
    },

    paymentMethod: {
      type: String,
      default: "cash"
    },

    receiptNo: {
      type: String
    }
  },
  { timestamps: true }
);

module.exports =
  mongoose.model(
    "Sale",
    saleSchema
  );