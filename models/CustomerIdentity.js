  const mongoose =
  require("mongoose");

const customerIdentitySchema =
  new mongoose.Schema(
    {
      owner: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      fullName: {
        type: String,
        required: true,
        trim: true,
        index: true
      },

      phone: {
        type: String,
        trim: true,
        sparse: true
      },

      nationalId: {
        type: String,
        default: "",
        trim: true,
        index: true
      },

      gender: {
        type: String,
        enum: [
          "",
          "male",
          "female"
        ],
        default: ""
      },

      dateOfBirth: {
        type: Date
      },

      region: {
        type: String,
        default: "",
        trim: true
      },

      district: {
        type: String,
        default: "",
        trim: true
      },

      ward: {
        type: String,
        default: "",
        trim: true
      },

      address: {
        type: String,
        default: ""
      },

      photo: {
        type: String,
        default: ""
      },

      faceId: {
        type: String,
        default: ""
      },

      fingerprintId: {
        type: String,
        trim: true,
        sparse: true
      },

      status: {
        type: String,
        enum: [
          "active",
          "blocked",
          "blacklisted"
        ],
        default:
          "active"
      },

      riskScore: {
        type: Number,
        default: 500,
        min: 0,
        max: 1000
      },

      totalLoans: {
        type: Number,
        default: 0
      },

      activeLoans: {
        type: Number,
        default: 0
      },

      overdueLoans: {
        type: Number,
        default: 0
      },

      paidLoans: {
        type: Number,
        default: 0
      },

      defaultedLoans: {
        type: Number,
        default: 0
      },

      totalBorrowed: {
        type: Number,
        default: 0
      },

      totalPaid: {
        type: Number,
        default: 0
      },

      notes: {
        type: String,
        default: ""
      },

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    },
    {
      timestamps: true
    }
  );


// BUSINESS-SCOPED UNIQUE
customerIdentitySchema.index(
  {
    owner: 1,
    phone: 1
  },
  {
    unique: true,
    sparse: true
  }
);

customerIdentitySchema.index(
  {
    owner: 1,
    nationalId: 1
  },
  {
    sparse: true
  }
);

customerIdentitySchema.index(
  {
    owner: 1,
    fingerprintId: 1
  },
  {
    unique: true,
    sparse: true
  }
);

customerIdentitySchema.index({
  owner: 1,
  status: 1
});

customerIdentitySchema.index({
  owner: 1,
  riskScore: -1
});

customerIdentitySchema.index({
  owner: 1,
  createdAt: -1
});
module.exports =
  mongoose.model(
    "CustomerIdentity",
    customerIdentitySchema
  );
