 const DebtLoan =
require("../models/DebtLoan");

const CustomerIdentity =
require("../models/CustomerIdentity");

const markOverdueLoans =
async () => {
  try {
    const today =
      new Date();

    const loans =
      await DebtLoan.find({
        status:
          "active",
        dueDate: {
          $lt: today
        },
        balanceAmount: {
          $gt: 0
        }
      });

    for (const loan of loans) {
      loan.status =
        "overdue";

      await loan.save();

      await CustomerIdentity.findByIdAndUpdate(
        loan.customer,
        {
          $inc: {
            overdueLoans: 1
          }
        }
      );
    }

    console.log(
      "Overdue updated:",
      loans.length
    );
  } catch (error) {
    console.log(
      error.message
    );
  }
};

module.exports = {
  markOverdueLoans
};
