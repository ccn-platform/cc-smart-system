  const CustomerIdentity =
require("../models/CustomerIdentity");

const DebtLoan =
require("../models/DebtLoan");

const DebtPayment =
require("../models/DebtPayment");

const {
  checkCreditEligibility
} = require(
  "../services/creditCheckService"
);


// FIND OR CREATE CUSTOMER
 
const findOrCreateCustomer =
async (req, res) => {
  try {
    const {
      fullName,
      phone,
      fingerprintId
    } = req.body;

    if (
      !phone &&
      !fingerprintId
    ) {
      return res.status(400).json({
        message:
          "Phone or fingerprint required"
      });
    }

    let customer = null;

    if (
      fingerprintId
    ) {
      customer =
        await CustomerIdentity.findOne({
          fingerprintId
        });
    }

    if (
      !customer &&
      phone
    ) {
      customer =
        await CustomerIdentity.findOne({
          phone
        });
    }

    if (!customer) {
      customer =
        await CustomerIdentity.create({
          fullName:
            fullName ||
            "Unknown",
          phone:
            phone ||
            fingerprintId,
          fingerprintId:
            fingerprintId || ""
        });
    } else {
      if (
        fingerprintId &&
        !customer.fingerprintId
      ) {
        customer.fingerprintId =
          fingerprintId;

        await customer.save();
      }
    }

    res.status(200).json(
      customer
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

// CHECK CREDIT
const checkCredit =
async (req, res) => {
  try {
    const {
      customerId,
      businessCategory
    } = req.body;

    const result =
      await checkCreditEligibility({
        customerId,
        businessCategory
      });

    res.status(200).json(
      result
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// CREATE LOAN
const createDebtLoan =
async (req, res) => {
  try {
    const {
      customerId,
      amount,
      dueDate,
      items,
      note,
      businessCategory
    } = req.body;

    const check =
      await checkCreditEligibility({
        customerId,
        businessCategory
      });

    if (
      !check.approved
    ) {
      return res.status(400).json({
        message:
          check.reason
      });
    }

    const loan =
      await DebtLoan.create({
        customer:
          customerId,
        user:
          req.user.id,
        branch:
          req.user.branch ||
          null,
        businessCategory,
        loanNumber:
          "LN" +
          Date.now(),
        principalAmount:
          Number(amount),
        balanceAmount:
          Number(amount),
        paidAmount: 0,
        dueDate,
        items:
          items || [],
        note:
          note || "",
        approvedBy:
          req.user.id
      });

    await CustomerIdentity.findByIdAndUpdate(
      customerId,
      {
        $inc: {
          totalLoans: 1,
          activeLoans: 1,
          totalBorrowed:
            Number(amount)
        }
      }
    );

    res.status(201).json(
      loan
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// GET HISTORY
const getLoanHistory =
async (req, res) => {
  try {
    const loans =
      await DebtLoan.find({
        user:
          req.user.id
      })
      .populate(
        "customer",
        "fullName phone"
      )
      .sort({
        createdAt: -1
      });

    res.status(200).json(
      loans
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


const scanFingerprint = async (req, res) => {
  try {
    const { fingerprintId } = req.body;

    if (!fingerprintId) {
      return res.status(400).json({
        message: "fingerprintId required"
      });
    }

    const customer =
      await CustomerIdentity.findOne({
        fingerprintId
      });

    if (!customer) {
      return res.status(200).json({
        found: false,
        message: "New customer"
      });
    }

    const activeLoans =
      await DebtLoan.find({
        customer: customer._id,
        status: {
          $in: [
            "active",
            "overdue"
          ]
        }
      });

    res.status(200).json({
      found: true,
      customer,
      loans: activeLoans
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// GET SINGLE LOAN
const getLoanById =
async (req, res) => {
  try {
    const loan =
      await DebtLoan.findOne({
        _id:
          req.params.id,
        user:
          req.user.id
      }).populate(
        "customer",
        "fullName phone"
      );

    if (!loan) {
      return res.status(404).json({
        message:
          "Loan not found"
      });
    }

    res.status(200).json(
      loan
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

const getOverdueLoans =
async (req, res) => {
  try {
    const loans =
      await DebtLoan.find({
        user:
          req.user.id,
        status:
          "overdue"
      })
      .populate(
        "customer",
        "fullName phone"
      )
      .sort({
        dueDate: 1
      });

    res.status(200).json(
      loans
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

// RECEIVE PAYMENT
const receivePayment =
async (req, res) => {
  try {
    const {
      loanId,
      amount,
      paymentMethod,
      reference
    } = req.body;

    const loan =
      await DebtLoan.findById(
        loanId
      );

    if (!loan) {
      return res.status(404).json({
        message:
          "Loan not found"
      });
    }

    const payAmount =
      Number(amount);

    await DebtPayment.create({
      loan:
        loan._id,
      customer:
        loan.customer,
      user:
        req.user.id,
      branch:
        loan.branch,
      amount:
        payAmount,
      paymentMethod:
        paymentMethod ||
        "cash",
      reference:
        reference || "",
      receivedBy:
        req.user.id
    });

    loan.paidAmount +=
      payAmount;

    loan.balanceAmount -=
      payAmount;

    if (
      loan.balanceAmount <= 0
    ) {
      loan.balanceAmount = 0;
      loan.status =
        "paid";

      await CustomerIdentity.findByIdAndUpdate(
        loan.customer,
        {
          $inc: {
            activeLoans: -1,
            paidLoans: 1
          }
        }
      );
    }

    await CustomerIdentity.findByIdAndUpdate(
      loan.customer,
      {
        $inc: {
          totalPaid:
            payAmount
        }
      }
    );

    await loan.save();

    res.status(200).json(
      loan
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


module.exports = {
  findOrCreateCustomer,
  checkCredit,
  createDebtLoan,
  getLoanHistory,
  getLoanById,
  receivePayment,
  scanFingerprint,
  getOverdueLoans
};
