const mongoose =
  require("mongoose");

const heldSaleSchema =
  new mongoose.Schema(
    {
      owner: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      branch: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true,
      },

      items: [
        {
          product: {
            type:
              mongoose.Schema.Types.ObjectId,
            ref: "Product",
          },

          name: {
            type: String,
          },

          qty: {
            type: Number,
            required: true,
          },

          price: {
            type: Number,
            required: true,
          },

          total: {
            type: Number,
            required: true,
          },
        },
      ],

      totalAmount: {
        type: Number,
        required: true,
        index: true,
      },

      notes: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

heldSaleSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "HeldSale",
    heldSaleSchema
  );
