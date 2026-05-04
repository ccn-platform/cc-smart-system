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

    // 🔥 REQUIRE NAME ONLY
 
    // 🔥 REQUIRE NAME ONLY
if (!fullName || fullName.trim() === "") {
  return res.status(400).json({
    message: "Customer name required"
  });
}

let customer = null;

// 🔍 FIND BY FINGERPRINT
if (fingerprintId && fingerprintId.trim() !== "") {
  customer = await CustomerIdentity.findOne({
    fingerprintId: fingerprintId.trim()
  });
}

// 🔍 FIND BY PHONE
if (!customer && phone && phone.trim() !== "") {
  customer = await CustomerIdentity.findOne({
    phone: phone.trim()
  });
}

// 🔥 CREATE CUSTOMER
if (!customer) {
  const data = {
    fullName: fullName.trim()
  };

  // ✅ ADD ONLY IF EXISTS
  if (phone && phone.trim() !== "") {
    data.phone = phone.trim();
  }

  if (fingerprintId && fingerprintId.trim() !== "") {
    data.fingerprintId = fingerprintId.trim();
  }

  customer = await CustomerIdentity.create(data);

} else {

  // 🔥 UPDATE FINGERPRINT IF MISSING
  if (
    fingerprintId &&
    fingerprintId.trim() !== "" &&
    !customer.fingerprintId
  ) {
    customer.fingerprintId = fingerprintId.trim();
    await customer.save();
  }
}

res.status(200).json(customer);
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
 
    // CREATE LOAN
const createDebtLoan = async (req, res) => {
  try {
    const {
      customerId,
      amount,
      dueDate,
      items,
      note,
      businessCategory
    } = req.body;

    // 🔥 VALIDATION (MUHIMU SANA)
    if (!customerId) {
      return res.status(400).json({
        message: "Customer required"
      });
    }

    const cleanAmount = Number(amount);

    if (!cleanAmount || cleanAmount <= 0) {
      return res.status(400).json({
        message: "Valid loan amount required"
      });
    }

    if (!dueDate) {
      return res.status(400).json({
        message: "Due date required"
      });
    }

    // 🔥 CREDIT CHECK
    const check = await checkCreditEligibility({
      customerId,
      businessCategory
    });

    if (!check.approved) {
      return res.status(400).json({
        message: check.reason
      });
    }

    // 🔥 CREATE LOAN
    const loan = await DebtLoan.create({
      customer: customerId,
      user: req.user.id,
      branch: req.user.branch || null,
      businessCategory,
      loanNumber: "LN" + Date.now(),
      principalAmount: cleanAmount,
      balanceAmount: cleanAmount,
      paidAmount: 0,
      dueDate,
      items: items || [],
      note: note || "",
      approvedBy: req.user.id
    });

    // 🔥 UPDATE CUSTOMER STATS
    await CustomerIdentity.findByIdAndUpdate(customerId, {
      $inc: {
        totalLoans: 1,
        activeLoans: 1,
        totalBorrowed: cleanAmount
      }
    });

    res.status(201).json(loan);

  } catch (error) {
    res.status(500).json({
      message: error.message
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
