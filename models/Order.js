  const mongoose = require("mongoose");

const orderItemSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true
      },

      qty: {
        type: Number,
        default: 0
      },

      buyPrice: {
        type: Number,
        default: 0
      },

      sellPrice: {
        type: Number,
        default: 0
      },

      profitEach: {
        type: Number,
        default: 0
      },

      profitTotal: {
        type: Number,
        default: 0
      },

      matched: {
        type: Boolean,
        default: false
      }
    },
    {
      _id: false
    }
  );

const orderSchema =
  new mongoose.Schema(
    {
      owner: {
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
        required: true,
        index: true
      },

      rawText: {
        type: String,
        default: ""
      },

      items: [
        orderItemSchema
      ],

      buyTotal: {
        type: Number,
        default: 0
      },

      sellTotal: {
        type: Number,
        default: 0
      },

      totalProfit: {
        type: Number,
        default: 0
      },

      status: {
        type: String,
        default: "completed",
        index: true
      }
    },
    {
      timestamps: true,
      minimize: true
    }
  );


// MULTI BRANCH INDEXES
orderSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1
});

orderSchema.index({
  owner: 1,
  branch: 1,
  status: 1
});

module.exports =
  mongoose.model(
    "Order",
    orderSchema
  );
