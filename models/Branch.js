  const mongoose =
  require("mongoose");

const branchSchema =
  new mongoose.Schema(
    {
      shop: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Shop",
        required: true,
        index: true
      },

      name: {
        type: String,
        required: true,
        trim: true
      },

      phone: {
        type: String,
        default: ""
      },

      manager: {
        type: String,
        default: ""
      },

      mkoa: String,
      wilaya: String,
      mtaa: String,

      isMain: {
        type: Boolean,
        default: false
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


// UNIQUE NAME PER SHOP
branchSchema.index(
  {
    shop: 1,
    name: 1
  },
  {
    unique: true
  }
);


// FAST LOOKUPS
branchSchema.index({
  shop: 1,
  isActive: 1
});

branchSchema.index({
  shop: 1,
  isMain: 1
});

module.exports =
  mongoose.model(
    "Branch",
    branchSchema
  );
