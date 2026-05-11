  const PLANS =
  require("../utils/subscriptionPlans");

const activatePlan =
  async (target, planName) => {
    const plan =
      PLANS[planName];

    if (!plan) {
      throw new Error(
        "Invalid plan"
      );
    }

    const now =
      new Date();

    let startDate =
      now;

    if (
      target.subscription?.expiresAt &&
      new Date(
        target.subscription.expiresAt
      ) > now
    ) {
      startDate =
        new Date(
          target.subscription.expiresAt
        );
    }

    const expiresAt =
      new Date(
        startDate.getTime() +
        plan.days *
          24 *
          60 *
          60 *
          1000
      );

    target.subscription = {
      plan: planName,
      startDate,
      expiresAt,
      isActive: true
    };

    target.pendingPlan = null;
    target.paymentReference =
      null;
    target.pendingExpiresAt =
      null;

    await target.save();

    return target.subscription;
  };

module.exports = {
  activatePlan
};
