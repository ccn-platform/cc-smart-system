 const CustomerIdentity =
  require("../models/CustomerIdentity");

const checkCreditEligibility = async ({
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

  return {
    approved: true,
    reason:
      "Eligible for credit"
  };
};

module.exports = {
  checkCreditEligibility
};
