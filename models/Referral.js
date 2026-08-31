  const mongoose = require("mongoose");

const referralSchema =
  new mongoose.Schema(
    {
      // =========================
      // USER ALIYEMWALIKA
      // =========================
      referrer: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
      },

      // =========================
      // USER ALIYEALIKWA
      // =========================
      referredUser: {
        type:
          mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true,
        index: true
      },

      // =========================
      // REFERRAL STATUS
      // =========================
      status: {
        type: String,
        enum: [
          "registered",
          "active",
          "subscribed",
          "cancelled"
        ],
        default: "registered",
        index: true
      },

      // =========================
      // REWARD STATUS
      // =========================
      rewardStatus: {
        type: String,
        enum: [
          "pending",
          "granted",
          "not_eligible"
        ],
        default: "pending",
        index: true
      },

      // =========================
      // REWARD TYPE
      // =========================
      rewardType: {
        type: String,
        enum: [
          "subscription_days",
          "none"
        ],
        default: "subscription_days"
      },

      // =========================
      // REWARD VALUE
      // MFANO: 7 DAYS
      // =========================
      rewardValue: {
        type: Number,
        default: 0,
        min: 0
      },

      // =========================
      // REFERRAL ACTIVATED
      // =========================
      activatedAt: {
        type: Date,
        default: null
      },

      // =========================
      // REWARD GIVEN
      // =========================
      rewardedAt: {
        type: Date,
        default: null
      }
    },
    {
      timestamps: true
    }
  );

module.exports =
  mongoose.model(
    "Referral",
    referralSchema
  );
