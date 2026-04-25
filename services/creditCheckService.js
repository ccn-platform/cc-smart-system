const CustomerIdentity =
require("../models/CustomerIdentity");

const DebtLoan =
require("../models/DebtLoan");

const checkCreditEligibility =
async ({
  customerId,
  businessCategory
}) => {
  const customer =
    await CustomerIdentity.findById(
      customerId
    );

  if (!customer) {
    return {
      approved: false,
      reason:
        "Customer not found"
    };
  }

  if (
    customer.status !==
    "active"
  ) {
    return {
      approved: false,
      reason:
        "Customer blocked"
    };
  }

  // active debts
  const activeDebts =
    await DebtLoan.countDocuments({
      customer:
        customerId,
      status:
        "active"
    });

  if (
    activeDebts >= 3
  ) {
    return {
      approved: false,
      reason:
        "Maximum active debts reached"
    };
  }

  // overdue debts
  const overdueDebt =
    await DebtLoan.findOne({
      customer:
        customerId,
      status:
        "overdue"
    });

  if (
    overdueDebt
  ) {
    return {
      approved: false,
      reason:
        "Customer has overdue debt"
    };
  }

  // category debts
  const sameCategoryDebts =
    await DebtLoan.countDocuments({
      customer:
        customerId,
      status:
        "active",
      businessCategory
    });

  if (
    sameCategoryDebts >= 2
  ) {
    return {
      approved: false,
      reason:
        "Too many debts in same category"
    };
  }

  // risk score
  if (
    customer.riskScore <
    30
  ) {
    return {
      approved: false,
      reason:
        "Low credit score"
    };
  }

  return {
    approved: true,
    reason:
      "Eligible for credit",
    activeDebts,
    riskScore:
      customer.riskScore
  };
};

module.exports = {
  checkCreditEligibility
};