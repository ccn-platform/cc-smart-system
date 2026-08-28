  
const mongoose =
  require("mongoose");

const subscriptionSchema =
  new mongoose.Schema(
    {
      plan: {
        type: String,
        enum: [
          "trial",
          "weekly",
          "monthly",
          "six_months",
          "yearly"
        ],
        default: "trial"
      },

      startDate: {
        type: Date,
        default: Date.now
      },

      expiresAt: {
        type: Date,
        default: () =>
          new Date(
            Date.now() +
              14 *
                24 *
                60 *
                60 *
                1000
          )
      },

      isActive: {
        type: Boolean,
        default: true
      }
    },
    {
      _id: false
    }
  );

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
      },

      // ==========================================
      // 🔥 SUBSCRIPTION
      // ==========================================

      subscription: {
        type:
          subscriptionSchema,
        default: () => ({})
      },

      // ==========================================
      // 🔥 PENDING PAYMENT
      // ==========================================

      pendingPlan: {
        type: String,
        enum: [
          "weekly",
          "monthly",
          "six_months",
          "yearly"
        ],
        default: null
      },

      paymentReference: {
        type: String,
        default: null,
        index: true
      },

      pendingExpiresAt: {
        type: Date,
        default: null
      },

      paymentProcessing: {
        type: Boolean,
        default: false
      },

      // ==========================================
      // 🔥 PAYMENT STATUS
      // ==========================================

      paymentStatus: {
        type: String,
        enum: [
          "idle",
          "pending",
          "success",
          "failed"
        ],
        default: "idle"
      },

      paymentCompletedAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true
    }
  );


// ============================================
// UNIQUE NAME PER SHOP
// ============================================

branchSchema.index(
  {
    shop: 1,
    name: 1
  },
  {
    unique: true
  }
);


// ============================================
// FAST LOOKUPS
// ============================================

branchSchema.index({
  shop: 1,
  isActive: 1
});

branchSchema.index({
  shop: 1,
  isMain: 1
});


// ============================================
// EXPORT
// ============================================

module.exports =
  mongoose.model(
    "Branch",
    branchSchema
  );
 
