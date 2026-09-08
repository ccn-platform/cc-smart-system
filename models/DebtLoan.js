  
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
          "pending_approval",
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


      // ====================================
      // SYNC
      // ====================================

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


      syncError: {
        type: String,
        default: ""
      },


      deleteSyncId: {
        type: String,
        default: null,
        index: true
      },


      deleteDeviceId: {
        type: String,
        default: null
      },


      deleteSource: {
        type: String,
        enum: [
          "online",
          "offline"
        ],
        default: null
      },


      deleteSyncedAt: {
        type: Date,
        default: null
      },


      deletedAt: {
        type: Date,
        default: null
      },


      queuedAt: {
        type: Date,
        default: null
      },


      // ====================================
      // LOAN INCREASE HISTORY
      //
      // NEW FIELD
      //
      // SAFE FOR LIVE SYSTEM.
      //
      // Existing loans will simply have
      // an empty array.
      // ====================================

      loanIncreases: [
        {
          // ==============================
          // AMOUNT ADDED
          // ==============================

          amount: {
            type: Number,
            required: true,
            min: 0
          },


          // ==============================
          // BEFORE INCREASE
          // ==============================

          previousPrincipalAmount: {
            type: Number,
            default: 0
          },


          previousBalanceAmount: {
            type: Number,
            default: 0
          },


          // ==============================
          // AFTER INCREASE
          // ==============================

          newPrincipalAmount: {
            type: Number,
            default: 0
          },


          newBalanceAmount: {
            type: Number,
            default: 0
          },


          // ==============================
          // OPTIONAL REASON
          // ==============================

          reason: {
            type: String,
            default: ""
          },


          // ==============================
          // USER WHO ADDED DEBT
          // ==============================

          createdBy: {
            type:
              mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
          },


          // ==============================
          // OFFLINE SYNC ID
          // ==============================

          syncId: {
            type: String,
            default: null
          },


          // ==============================
          // DEVICE
          // ==============================

          deviceId: {
            type: String,
            default: null
          },


          // ==============================
          // SOURCE
          // ==============================

          source: {
            type: String,
            enum: [
              "online",
              "offline"
            ],
            default: "online"
          },


          // ==============================
          // SYNC STATUS
          // ==============================

          syncStatus: {
            type: String,
            enum: [
              "synced",
              "pending",
              "conflict"
            ],
            default: "synced"
          },


          // ==============================
          // DATE
          // ==============================

          createdAt: {
            type: Date,
            default: Date.now
          }
        }
      ],


      // ====================================
      // APPROVAL METHOD
      // ====================================

      approvalMethod: {
        type: String,
        enum: [
          "auto",
          "manual",
          "offline_pending"
        ],
        default: "auto"
      }
    },
    {
      timestamps: true
    }
  );



// ====================================
// MULTI BRANCH INDEXES
// ====================================

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



// ====================================
// UNIQUE LOAN SYNC ID
// ====================================

debtLoanSchema.index(
  {
    owner: 1,
    branch: 1,
    syncId: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      syncId: {
        $type: "string"
      }
    }
  }
);



// ====================================
// UNIQUE DELETE SYNC ID
// ====================================

debtLoanSchema.index(
  {
    owner: 1,
    branch: 1,
    deleteSyncId: 1
  },
  {
    unique: true,
    partialFilterExpression: {
      deleteSyncId: {
        $type: "string"
      }
    }
  }
);

// ====================================
// LOAN INCREASE SYNC LOOKUP INDEX
//
// Used to quickly find an increase
// that was already synced.
//
// IMPORTANT:
//
// This helps prevent the same offline
// loan increase from being applied twice.
// ====================================

debtLoanSchema.index({
  owner: 1,
  branch: 1,
  "loanIncreases.syncId": 1
});

module.exports =
  mongoose.model(
    "DebtLoan",
    debtLoanSchema
  );
 
