  const PLANS = require("../utils/subscriptionPlans");

const activatePlan = async (user, planName) => {
  const plan = PLANS[planName];

  if (!plan) {
    throw new Error("Invalid plan");
  }

  const now = new Date();

  let startDate = now;

  // 🔥 kama bado subscription haijaisha → extend
  if (
    user.subscription?.expiresAt &&
    new Date(user.subscription.expiresAt) > now
  ) {
    startDate = new Date(user.subscription.expiresAt);
  }

  const expiresAt = new Date(
    startDate.getTime() + plan.days * 24 * 60 * 60 * 1000
  );

  user.subscription = {
    plan: planName,
    startDate,
    expiresAt,
    isActive: true
  };

  // 🔥 NEW (MUHIMU SANA)
  user.pendingPlan = null;
  user.paymentReference = null;

  await user.save();

  return user.subscription;
};

module.exports = {
  activatePlan
};
