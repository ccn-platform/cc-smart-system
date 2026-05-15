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
          status: "active",
          dueDate: {
            $lt: today
          },
          balanceAmount: {
            $gt: 0
          }
        }).select("_id customer");

      for (const loan of loans) {
        await DebtLoan.updateOne(
          {
            _id: loan._id
          },
          {
            $set: {
              status: "overdue"
            }
          }
        );

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
        "OVERDUE ERROR:",
        error.message
      );
    }
  };

module.exports = {
  markOverdueLoans
};
