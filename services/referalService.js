const mongoose = require("mongoose");

const Referral = require("../models/Referral");
const User = require("../models/User");
const Shop = require("../models/Shop");
const Branch = require("../models/Branch");


// =====================================================
// PROCESS REFERRAL REWARD
// =====================================================
//
// Hii function inatumika pale ambapo user aliyealikwa
// amekuwa eligible kupata referral reward.
//
// MFANO:
//
// OWNER A
//   ↓ referral
// OWNER B
//   ↓
// B anakuwa eligible
//   ↓
// A anapata +7 days
//
// IMPORTANT:
// Reward haitatolewa mara mbili.
// =====================================================

const processReferralReward = async (
  referredUserId
) => {

  const session =
    await mongoose.startSession();

  try {

    session.startTransaction();


    // =================================================
    // FIND REFERRAL
    // =================================================

    const referral =
      await Referral.findOne({
        referredUser:
          referredUserId,

        rewardStatus:
          "pending"
      }).session(session);


    // Hakuna referral pending
    if (!referral) {

      await session.abortTransaction();

      return {
        success: false,

        message:
          "No pending referral found"
      };
    }


    // =================================================
    // FIND REFERRED USER
    // =================================================

    const referredUser =
      await User.findById(
        referral.referredUser
      ).session(session);


    if (!referredUser) {

      await session.abortTransaction();

      return {
        success: false,

        message:
          "Referred user not found"
      };
    }


    // =================================================
    // ONLY OWNER CAN GENERATE REFERRAL REWARD
    // =================================================

    if (
      referredUser.role !==
      "owner"
    ) {

      await Referral.updateOne(
        {
          _id:
            referral._id
        },
        {
          $set: {
            rewardStatus:
              "not_eligible"
          }
        },
        {
          session
        }
      );

      await session.commitTransaction();

      return {
        success: false,

        message:
          "Referred user is not eligible"
      };
    }


    // =================================================
    // FIND REFERRER
    // =================================================

    const referrer =
      await User.findById(
        referral.referrer
      ).session(session);


    if (!referrer) {

      await Referral.updateOne(
        {
          _id:
            referral._id
        },
        {
          $set: {
            rewardStatus:
              "not_eligible"
          }
        },
        {
          session
        }
      );

      await session.commitTransaction();

      return {
        success: false,

        message:
          "Referrer not found"
      };
    }


    // =================================================
    // FIND REFERRER SHOP
    // =================================================

    const shop =
      await Shop.findOne({
        owner:
          referrer._id
      }).session(session);


    if (!shop) {

      await session.abortTransaction();

      return {
        success: false,

        message:
          "Referrer shop not found"
      };
    }


    // =================================================
    // FIND MAIN BRANCH
    // =================================================

    const branch =
      await Branch.findOne({
        shop:
          shop._id,

        isMain:
          true
      }).session(session);


    if (!branch) {

      await session.abortTransaction();

      return {
        success: false,

        message:
          "Referrer main branch not found"
      };
    }


    // =================================================
    // CHECK SUBSCRIPTION
    // =================================================

    if (
      !branch.subscription
    ) {

      await session.abortTransaction();

      return {
        success: false,

        message:
          "Referrer subscription not found"
      };
    }


    // =================================================
    // REWARD DAYS
    // =================================================

    const rewardDays =
      Number(
        referral.rewardValue
      ) || 0;


    if (
      rewardDays <= 0
    ) {

      await Referral.updateOne(
        {
          _id:
            referral._id
        },
        {
          $set: {
            rewardStatus:
              "not_eligible"
          }
        },
        {
          session
        }
      );

      await session.commitTransaction();

      return {
        success: false,

        message:
          "Invalid referral reward"
      };
    }


    // =================================================
    // CALCULATE EXPIRY
    // =================================================

    const now =
      new Date();

    let currentExpiry =
      branch.subscription.expiresAt
        ? new Date(
            branch.subscription.expiresAt
          )
        : null;


    // ================================================
    // IF CURRENT SUBSCRIPTION IS STILL ACTIVE
    // ================================================

    let baseDate =
      now;

    if (
      currentExpiry &&
      currentExpiry.getTime() >
        now.getTime()
    ) {

      baseDate =
        currentExpiry;
    }


    // =================================================
    // ADD REWARD DAYS
    // =================================================

    const newExpiry =
      new Date(
        baseDate.getTime() +
        rewardDays *
          24 *
          60 *
          60 *
          1000
      );


    // =================================================
    // UPDATE SUBSCRIPTION
    // =================================================

    branch.subscription.expiresAt =
      newExpiry;

    branch.subscription.isActive =
      true;


    // =================================================
    // IF SUBSCRIPTION PLAN IS EXPIRED/TRIAL
    // KEEP EXISTING PLAN
    // =================================================

    await branch.save({
      session
    });


    // =================================================
    // UPDATE REFERRAL
    // =================================================

    referral.status =
      "subscribed";

    referral.rewardStatus =
      "granted";

    referral.activatedAt =
      now;

    referral.rewardedAt =
      now;


    await referral.save({
      session
    });


    // =================================================
    // COMMIT
    // =================================================

    await session.commitTransaction();


    return {

      success: true,

      message:
        `Referral reward of ${rewardDays} days granted`,

      referralId:
        referral._id,

      referrerId:
        referrer._id,

      referredUserId:
        referredUser._id,

      rewardDays,

      expiresAt:
        newExpiry
    };

  } catch (error) {

    await session.abortTransaction();

    console.error(
      "PROCESS REFERRAL REWARD ERROR:",
      error
    );

    throw error;

  } finally {

    session.endSession();
  }
};


// =====================================================
// CHECK REFERRAL STATUS
// =====================================================

const getReferralStatus =
  async (
    referredUserId
  ) => {

    try {

      const referral =
        await Referral.findOne({
          referredUser:
            referredUserId
        })
          .populate(
            "referrer",
            "name businessName referralCode"
          )
          .populate(
            "referredUser",
            "name businessName"
          )
          .lean();


      if (!referral) {

        return null;
      }


      return referral;

    } catch (error) {

      console.error(
        "GET REFERRAL STATUS ERROR:",
        error
      );

      throw error;
    }
  };


// =====================================================
// EXPORT
// =====================================================

module.exports = {

  processReferralReward,

  getReferralStatus

};
