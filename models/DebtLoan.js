  const mongoose =
  require("mongoose");

const debtLoanSchema =
  new mongoose.Schema(
    {
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

      createdBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },

      branch: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        required: true,
        index: true
      },

      businessCategory: {
        type: String,
        default: "",
        index: true
      },

      loanNumber: {
        type: String,
        required: true
      },

      principalAmount: {
        type: Number,
        required: true,
        min: 1
      },

      balanceAmount: {
        type: Number,
        required: true,
        min: 0
      },

      paidAmount: {
        type: Number,
        default: 0,
        min: 0
      },

      dueDate: {
        type: Date,
        required: true
      },

      daysLate: {
        type: Number,
        default: 0
      },

      lastPaymentDate: {
        type: Date,
        default: null
      },

      status: {
        type: String,
        enum: [
          "active",
          "paid",
          "overdue",
          "defaulted",
          "cancelled"
        ],
        default:
          "active"
      },

      items: [
        {
          name: String,
          qty: Number,
          price: Number
        }
      ],

      note: {
        type: String,
        default: ""
      },

      approvedBy: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
      },
syncId: {
  type: String,
  default: null,
  index: true
},

syncStatus: {
  type: String,
  enum: [
    "synced",
    "pending",
    "conflict"
  ],
  default: "synced",
  index: true
},

source: {
  type: String,
  enum: [
    "online",
    "offline"
  ],
  default: "online"
},

deviceId: {
  type: String,
  default: null
},

lastSyncedAt: {
  type: Date,
  default: null
},

      approvalMethod: {
        type: String,
        enum: [
          "auto",
          "manual"
        ],
        default: "auto"
      }
    },
    {
      timestamps: true
    }
  );


// MULTI BRANCH INDEXES
debtLoanSchema.index({
  owner: 1,
  branch: 1,
  status: 1
});

debtLoanSchema.index({
  owner: 1,
  branch: 1,
  customer: 1
});

debtLoanSchema.index({
  owner: 1,
  branch: 1,
  dueDate: 1
});

debtLoanSchema.index(
  {
    owner: 1,
    branch: 1,
    loanNumber: 1
  },
  {
    unique: true
  }
);

debtLoanSchema.index({
  owner: 1,
  branch: 1,
  createdAt: -1
});

debtLoanSchema.index({
  owner: 1,
  branch: 1,
  status: 1,
  createdAt: -1
});

debtLoanSchema.index({
  owner: 1,
  branch: 1,
  customer: 1,
  status: 1
});
debtLoanSchema.index({
  owner: 1,
  branch: 1,
  syncStatus: 1
});

debtLoanSchema.index({
  owner: 1,
  branch: 1,
  syncId: 1
});

module.exports =
  mongoose.model(
    "DebtLoan",
    debtLoanSchema
  );
