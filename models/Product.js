    const mongoose = require("mongoose");

const productSchema =
  new mongoose.Schema(
    {
     owner: {
      type: mongoose.Schema.Types.ObjectId,
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
normalizedName: {
  type: String,
  index: true,
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
        index: true // 🔥 added (search/filter fast)
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
        index: true // 🔥 useful kwa stock queries
      },

      lowStockAlert: {
        type: Number,
        default: 5
      },

      isActive: {
        type: Boolean,
        default: true,
        index: true // 🔥 filtering fast
      },

createdBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

updatedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

deletedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null
},

deletedAt: {
  type: Date,
  default: null
}
    },
    {
      timestamps: true,
      minimize: true // 🔥 optimization
    }
  );

  const normalizeProductName =
 require("../utils/normalizeProductName");

// 🔥 AUTO NORMALIZE
productSchema.pre("save", function (next) {
  if (this.name) {
    this.normalizedName =
      normalizeProductName(this.name);
  }

  next();
});
// 🔥 IMPORTANT INDEXES (HAZIBADILISHI LOGIC)
 productSchema.index({ owner: 1, name: 1 });
 productSchema.index(
  { owner: 1, barcode: 1 },
  { unique: true, sparse: true }
);
productSchema.index({ owner: 1, createdAt: -1 });
productSchema.index({
  owner: 1,
  normalizedName: 1,
  isActive: 1
});
// 🔥 TEXT SEARCH (fast search)
productSchema.index({
  name: "text",
  aliases: "text",
  category: "text"
});
module.exports =
  mongoose.model(
    "Product",
    productSchema
  );
