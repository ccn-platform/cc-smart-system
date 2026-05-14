   const mongoose = require("mongoose");

const orderItemSchema =
  new mongoose.Schema(
    {
      name: {
  type: String,
  required: true,
  trim: true,
  maxlength: 200
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
       },

      branch: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        
      },

      rawText: {
       type: String,
        default: "",
         maxlength: 50000
       },
      items: {
        type: [orderItemSchema],
          validate: {
         validator(v) {
         return !v || v.length <= 1000;
        },
       message: "Too many items"
      }
    },
      

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
