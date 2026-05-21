const mongoose = require("mongoose");
const normalizeProductName =
  require("../utils/normalizeProductName");

const productSchema =
  new mongoose.Schema(
    {
      owner: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },

      branch: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
      },

      normalizedName: {
        type: String,
        trim: true,
        maxlength: 200
      },

      aliases: [
        {
          type: String,
          trim: true,
          maxlength: 100
        }
      ],

      barcode: {
        type: String,
        default: null,
        trim: true,
        maxlength: 100
      },

      category: {
        type: String,
        default: "General",
        trim: true,
        maxlength: 100
      },

      unit: {
        type: String,
        default: "pcs",
        trim: true,
        maxlength: 20
      },

      description: {
        type: String,
        default: "",
        maxlength: 1000
      },

      image: {
        type: String,
        default: "",
        maxlength: 1000
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
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      updatedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      deletedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
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
      minimize: true
    }
  );

productSchema.pre(
  "save",
  function () {
    if (this.name) {
      this.normalizedName =
        normalizeProductName(
          this.name
        );
    }
  }
);

productSchema.pre(
  "findOneAndUpdate",
  function () {
    const update =
      this.getUpdate();

    const newName =
      update?.name ||
      update?.$set?.name;

    if (newName) {
      if (update.$set) {
        update.$set.normalizedName =
          normalizeProductName(
            newName
          );
      } else {
        update.normalizedName =
          normalizeProductName(
            newName
          );
      }
    }
  }
);

productSchema.pre(
  "updateOne",
  function () {
    const update =
      this.getUpdate();

    const newName =
      update?.name ||
      update?.$set?.name;

    if (newName) {
      if (update.$set) {
        update.$set.normalizedName =
          normalizeProductName(
            newName
          );
      } else {
        update.normalizedName =
          normalizeProductName(
            newName
          );
      }
    }
  }
);


// NAME LOOKUPS
productSchema.index({
  owner: 1,
  branch: 1,
  name: 1
});

// OCR / MATCHING FAST LOOKUP
productSchema.index({
  owner: 1,
  branch: 1,
  isActive: 1,
  normalizedName: 1
});

// BARCODE
productSchema.index(
  {
    owner: 1,
    branch: 1,
    barcode: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      barcode: {
        $type: "string"
      }
    }
  }
);

// PRODUCT LISTS
productSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1
});

// UNIQUE ACTIVE PRODUCT NAME
productSchema.index(
  {
    owner: 1,
    branch: 1,
    normalizedName: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      isActive: true
    }
  }
);

module.exports =
  mongoose.model(
    "Product",
    productSchema
  );
