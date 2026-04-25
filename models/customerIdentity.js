const mongoose =
require("mongoose");

const customerIdentitySchema =
new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true
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
      type: Date,
      default: null
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
      default: ""
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
      default: 50
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
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports =
mongoose.model(
  "CustomerIdentity",
  customerIdentitySchema
);