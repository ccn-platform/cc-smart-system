  const mongoose = require("mongoose");

const saleSchema =
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

      items: [
        {
          product: {
            type:
              mongoose.Schema.Types.ObjectId,
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
        required: true,
        index: true
      },

      totalProfit: {
        type: Number,
        default: 0
      },

      paymentMethod: {
        type: String,
        default: "cash",
        index: true
      },

      customerName: {
        type: String,
        default: "",
        trim: true,
        maxlength: 150
       },
      receiptNo: {
        type: String
      }
    },
    {
      timestamps: true
    }
  );


// MULTI BRANCH INDEXES
saleSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1
});

saleSchema.index({
  owner: 1,
  branch: 1,
  paymentMethod: 1
});

module.exports =
  mongoose.model(
    "Sale",
    saleSchema
  );
