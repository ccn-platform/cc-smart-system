  const Referral =
  require("../models/Referral");

const User =
  require("../models/User");


// =====================================================
// GET MY REFERRAL INFO
// =====================================================

const getMyReferral =
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user._id
        ).select(
          "name referralCode"
        );

      if (!user) {
        return res.status(404).json({
          message:
            "User not found"
        });
      }


      // =================================================
      // TOTAL REFERRALS
      // =================================================

      const totalReferrals =
        await Referral.countDocuments({
          referrer:
            user._id
        });


      // =================================================
      // REGISTERED REFERRALS
      // =================================================

      const registeredReferrals =
        await Referral.countDocuments({
          referrer:
            user._id,

          status:
            "registered"
        });


      // =================================================
      // REWARDED REFERRALS
      // =================================================

      const rewardedReferrals =
        await Referral.countDocuments({
          referrer:
            user._id,

          rewardStatus:
            "rewarded"
        });


      // =================================================
      // PENDING REWARDS
      // =================================================

      const pendingRewards =
        await Referral.countDocuments({
          referrer:
            user._id,

          rewardStatus:
            "pending"
        });


      return res.status(200).json({

        referralCode:
          user.referralCode,

        totalReferrals,

        registeredReferrals,

        rewardedReferrals,

        pendingRewards

      });

    } catch (error) {

      console.error(
        "GET REFERRAL INFO ERROR:",
        error
      );

      return res.status(500).json({

        message:
          "Failed to get referral information",

        error:
          error.message

      });
    }
  };


// =====================================================
// GET MY REFERRAL LIST
// =====================================================

const getMyReferrals =
  async (req, res) => {

    try {

      const referrals =
        await Referral.find({
          referrer:
            req.user._id
        })
          .populate(
            "referredUser",
            "name businessName phone createdAt"
          )
          .sort({
            createdAt:
              -1
          })
          .lean();


      return res.status(200).json(
        referrals
      );

    } catch (error) {

      console.error(
        "GET REFERRALS ERROR:",
        error
      );

      return res.status(500).json({

        message:
          "Failed to get referrals",

        error:
          error.message

      });
    }
  };


// =====================================================
// GET REFERRAL DASHBOARD
// =====================================================

const getReferralDashboard =
  async (req, res) => {

    try {

      const user =
        await User.findById(
          req.user._id
        ).select(
          "name referralCode"
        );

      if (!user) {

        return res.status(404).json({

          message:
            "User not found"

        });
      }


      const referrals =
        await Referral.find({
          referrer:
            user._id
        })
          .populate(
            "referredUser",
            "name businessName phone createdAt"
          )
          .sort({
            createdAt:
              -1
          })
          .lean();


      // =================================================
      // TOTAL
      // =================================================

      const total =
        referrals.length;


      // =================================================
      // REGISTERED
      // =================================================

      const registered =
        referrals.filter(
          item =>
            item.status ===
            "registered"
        ).length;


      // =================================================
      // REWARDED
      // =================================================

      const rewarded =
        referrals.filter(
          item =>
            item.rewardStatus ===
            "rewarded"
        ).length;


      // =================================================
      // PENDING
      // =================================================

      const pending =
        referrals.filter(
          item =>
            item.rewardStatus ===
            "pending"
        ).length;


      return res.status(200).json({

        referralCode:
          user.referralCode,

        total,

        registered,

        rewarded,

        pending,

        referrals

      });

    } catch (error) {

      console.error(
        "REFERRAL DASHBOARD ERROR:",
        error
      );

      return res.status(500).json({

        message:
          "Failed to load referral dashboard",

        error:
          error.message

      });
    }
  };


// =====================================================
// GET SINGLE REFERRAL
// =====================================================

const getReferralById =
  async (req, res) => {

    try {

      const {
        id
      } = req.params;


      const referral =
        await Referral.findOne({

          _id:
            id,

          referrer:
            req.user._id

        })
          .populate(
            "referredUser",
            "name businessName phone createdAt"
          )
          .lean();


      if (!referral) {

        return res.status(404).json({

          message:
            "Referral not found"

        });
      }


      return res.status(200).json(
        referral
      );

    } catch (error) {

      console.error(
        "GET REFERRAL BY ID ERROR:",
        error
      );

      return res.status(500).json({

        message:
          "Failed to get referral",

        error:
          error.message

      });
    }
  };


// =====================================================
// EXPORT
// =====================================================

module.exports = {

  getMyReferral,

  getMyReferrals,

  getReferralDashboard,

  getReferralById

};
