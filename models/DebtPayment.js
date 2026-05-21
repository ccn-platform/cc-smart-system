  const mongoose =
  require("mongoose");

const debtPaymentSchema =
  new mongoose.Schema(
    {
      loan: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "DebtLoan",
        required: true,
        index: true
      },

      customer: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref:
          "CustomerIdentity",
        required: true,
        index: true
      },

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

      amount: {
        type: Number,
        required: true,
        min: 1
      },

      paymentDate: {
        type: Date,
        default: Date.now
      },

      paymentMethod: {
        type: String,
        enum: [
          "cash",
          "bank",
          "mobile_money",
          "mixed"
        ],
        default:
          "cash"
      },

      channel: {
        type: String,
        enum: [
          "app",
          "staff",
          "import",
          "system"
        ],
        default:
          "staff"
      },

      reference: {
        type: String,
        default: "",
        trim: true
      },

      externalId: {
        type: String,
        default: "",
        trim: true
      },

      note: {
        type: String,
        default: ""
      },

      receivedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      },

      status: {
        type: String,
        enum: [
          "posted",
          "reversed"
        ],
        default:
          "posted"
      }
    },
    {
      timestamps: true
    }
  );


// MULTI BRANCH INDEXES
debtPaymentSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1
});

debtPaymentSchema.index({
  owner: 1,
  branch: 1,
  loan: 1
});

debtPaymentSchema.index({
  owner: 1,
  branch: 1,
  customer: 1
});

debtPaymentSchema.index({
  owner: 1,
  branch: 1,
  paymentMethod: 1
});

debtPaymentSchema.index({
  owner: 1,
  branch: 1,
  loan: 1,
  status: 1,
  paymentDate: -1
});

debtPaymentSchema.index({
  owner: 1,
  branch: 1,
  customer: 1,
  status: 1
});
module.exports =
  mongoose.model(
    "DebtPayment",
    debtPaymentSchema
  );
