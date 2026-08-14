     
 const mongoose =
  require("mongoose");
 const CustomerIdentity =
  require("../models/CustomerIdentity");

const DebtLoan =
  require("../models/DebtLoan");

const DebtPayment =
  require("../models/DebtPayment");

const {readDebtImage
} = require( "../services/ocrService");

const {
  checkCreditEligibility
} = require("../services/creditCheckService");


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
        !fullName ||
        fullName.trim() === ""
      ) {
        return res.status(400).json({
          message:
            "Customer name required"
        });
      }

      let customer = null;

      if (
        fingerprintId &&
        fingerprintId.trim()
      ) {
       customer =
  await CustomerIdentity.findOne({
    owner: req.ownerId,
    fingerprintId:
      fingerprintId.trim()
  });
      }

      if (
        !customer &&
        phone &&
        phone.trim()
      ) {
      customer =
  await CustomerIdentity.findOne({
    owner: req.ownerId,
    phone: phone.trim()
  });
      }

      if (!customer) {
  const data = {
    owner:
      req.ownerId,
    createdBy:
      req.user.id,
    fullName:
      fullName.trim()
  };

  if (
    phone &&
    phone.trim()
  ) {
    data.phone =
      phone.trim();
  }

  if (
    fingerprintId &&
    fingerprintId.trim()
  ) {
    data.fingerprintId =
      fingerprintId.trim();
  }

  try {
    customer =
      await CustomerIdentity.create(
        data
      );

  } catch (err) {
    if (
      err.code === 11000
    ) {
      customer =
        await CustomerIdentity.findOne({
          owner:
            req.ownerId,
          $or: [
            phone &&
            phone.trim()
              ? {
                  phone:
                    phone.trim()
                }
              : null,

            fingerprintId &&
            fingerprintId.trim()
              ? {
                  fingerprintId:
                    fingerprintId.trim()
                }
              : null
          ].filter(Boolean)
        });
    } else {
      throw err;
    }
  }

} else {
  if (
    fingerprintId &&
    fingerprintId.trim() &&
    !customer.fingerprintId
  ) {
    customer.fingerprintId =
      fingerprintId.trim();

    await customer.save();
  }
}

      return res.status(200).json(
        customer
      );

    } catch (error) {
      return res.status(500).json({
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

      return res.status(200).json(
        result
      );

    } catch (error) {
      return res.status(500).json({
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
        businessCategory,

        // NEW: offline sync fields
        source,
        syncId,
        deviceId
      } = req.body;

      // --------------------------------
      // BASIC VALIDATION
      // --------------------------------

      if (!customerId) {
        return res.status(400).json({
          message:
            "Customer required"
        });
      }

      const cleanAmount =
        Number(amount);

      if (
        !cleanAmount ||
        cleanAmount <= 0
      ) {
        return res.status(400).json({
          message:
            "Valid loan amount required"
        });
      }

      if (!dueDate) {
        return res.status(400).json({
          message:
            "Due date required"
        });
      }

      // --------------------------------
      // OFFLINE DETECTION
      // --------------------------------

      const isOffline =
        source === "offline";

      // --------------------------------
      // BACKWARD COMPATIBILITY
      // --------------------------------
      //
      // OLD APP:
      // source haipo
      // => existing credit check inaendelea
      //
      // NEW OFFLINE APP:
      // source === "offline"
      // => credit eligibility check inarukwa
      //
      // Customer anaweza kuwa na loans nyingi.
      // --------------------------------

      if (!isOffline) {
        const check =
          await checkCreditEligibility({
            customerId,
            businessCategory
          });

        if (!check.approved) {
          return res.status(400).json({
            message:
              check.reason
          });
        }
      }

      // --------------------------------
      // OFFLINE SYNC DUPLICATE PROTECTION
      // --------------------------------

      if (
        isOffline &&
        syncId
      ) {
        const existingLoan =
          await DebtLoan.findOne({
            owner:
              req.ownerId,
            branch:
              req.branchId,
            syncId
          }).lean();

        if (existingLoan) {
          return res.status(200).json({
            ...existingLoan,
            alreadySynced: true
          });
        }
      }

      // --------------------------------
      // CREATE LOAN
      // --------------------------------

      const session =
        await mongoose.startSession();

      try {
        session.startTransaction();

        const loan =
          await DebtLoan.create(
            [
              {
                owner:
                  req.ownerId,

                branch:
                  req.branchId,

                createdBy:
                  req.user.id,

                customer:
                  customerId,

                businessCategory:
                  businessCategory || "",

                loanNumber:
                  "LN" +
                  Date.now() +
                  Math.floor(
                    Math.random() *
                    10000
                  ),

                principalAmount:
                  cleanAmount,

                balanceAmount:
                  cleanAmount,

                paidAmount:
                  0,

                dueDate,

                items:
                  items || [],

                note:
                  note || "",

                approvedBy:
                  isOffline
                    ? null
                    : req.user.id,

                // --------------------------------
                // OFFLINE / SYNC FIELDS
                // --------------------------------

                syncId:
                  syncId || null,

                syncStatus:
                  isOffline
                     ? "pending"
                     : "synced",

                source:
                  isOffline
                    ? "offline"
                    : "online",

                deviceId:
                  deviceId || null,

               lastSyncedAt:
                  isOffline
                    ? null
                    : new Date(),

                syncError:
                  "",

                queuedAt:
                  isOffline
                    ? null
                    : null,

                approvalMethod:
                  isOffline
                    ? "offline_pending"
                    : "auto"
              }
            ],
            {
              session
            }
          );

        // --------------------------------
        // UPDATE CUSTOMER COUNTERS
        // --------------------------------

        await CustomerIdentity.findByIdAndUpdate(
          customerId,
          {
            $inc: {
              totalLoans:
                1,

              activeLoans:
                1,

              totalBorrowed:
                cleanAmount
            }
          },
          {
            session
          }
        );

        await session.commitTransaction();

        return res.status(201).json(
          loan[0]
        );

      } catch (err) {

        if (
          session.inTransaction()
        ) {
          await session.abortTransaction();
        }

        // --------------------------------
        // DUPLICATE syncId
        // --------------------------------

        if (
          err?.code === 11000 &&
          isOffline &&
          syncId
        ) {
          const existingLoan =
            await DebtLoan.findOne({
              owner:
                req.ownerId,

              branch:
                req.branchId,

              syncId
            }).lean();

          if (existingLoan) {
            return res.status(200).json({
              ...existingLoan,
              alreadySynced: true
            });
          }
        }

        throw err;

      } finally {
        await session.endSession();
      }

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };

  // SYNC OFFLINE LOAN
const syncLoan =
  async (req, res) => {
    try {
      const {
        customerId,
        amount,
        dueDate,
        items,
        note,
        businessCategory,
        syncId,
        deviceId
      } = req.body;

      // --------------------------------
      // REQUIRED FIELDS
      // --------------------------------

      if (!customerId) {
        return res.status(400).json({
          message:
            "Customer required"
        });
      }

      if (!syncId) {
        return res.status(400).json({
          message:
            "syncId required"
        });
      }

      if (!deviceId) {
        return res.status(400).json({
          message:
            "deviceId required"
        });
      }

      const cleanAmount =
        Number(amount);

      if (
        !cleanAmount ||
        cleanAmount <= 0
      ) {
        return res.status(400).json({
          message:
            "Valid loan amount required"
        });
      }

      if (!dueDate) {
        return res.status(400).json({
          message:
            "Due date required"
        });
      }

      // --------------------------------
      // CHECK DUPLICATE SYNC
      // --------------------------------

      const existingLoan =
        await DebtLoan.findOne({
          owner:
            req.ownerId,

          branch:
            req.branchId,

          syncId
        }).lean();

      if (existingLoan) {
        return res.status(200).json({
          success: true,
          alreadySynced: true,
          loan:
            existingLoan
        });
      }

      // --------------------------------
      // VERIFY CUSTOMER
      // --------------------------------

      const customer =
        await CustomerIdentity.findOne({
          _id:
            customerId,

          owner:
            req.ownerId
        }).lean();

      if (!customer) {
        return res.status(404).json({
          message:
            "Customer not found"
        });
      }

      // --------------------------------
      // CREATE SERVER LOAN
      // --------------------------------

      const session =
        await mongoose.startSession();

      try {
        session.startTransaction();

        const loan =
          await DebtLoan.create(
            [
              {
                owner:
                  req.ownerId,

                branch:
                  req.branchId,

                createdBy:
                  req.user.id,

                customer:
                  customerId,

                businessCategory:
                  businessCategory || "",

                loanNumber:
                  "LN" +
                  Date.now() +
                  Math.floor(
                    Math.random() *
                    10000
                  ),

                principalAmount:
                  cleanAmount,

                balanceAmount:
                  cleanAmount,

                paidAmount:
                  0,

                dueDate,

                items:
                  Array.isArray(items)
                    ? items
                    : [],

                note:
                  note || "",

                // Offline loan has now
                // arrived at server.
                approvedBy:
                  null,

                // --------------------------------
                // SYNC INFORMATION
                // --------------------------------

                syncId:
                  syncId,

                syncStatus:
                  "synced",

                source:
                  "offline",

                deviceId:
                  deviceId,

                lastSyncedAt:
                  new Date(),

                syncError:
                  "",

                queuedAt:
                  null,

                approvalMethod:
                  "offline_pending",

                // Loan is now active
                // on the server.
                status:
                  "active"
              }
            ],
            {
              session
            }
          );

        // --------------------------------
        // UPDATE CUSTOMER COUNTERS
        // --------------------------------

        await CustomerIdentity.findByIdAndUpdate(
          customerId,
          {
            $inc: {
              totalLoans:
                1,

              activeLoans:
                1,

              totalBorrowed:
                cleanAmount
            }
          },
          {
            session
          }
        );

        await session.commitTransaction();

        return res.status(201).json({
          success: true,
          alreadySynced: false,
          loan:
            loan[0]
        });

      } catch (err) {

        if (
          session.inTransaction()
        ) {
          await session.abortTransaction();
        }

        // --------------------------------
        // DUPLICATE syncId
        // --------------------------------

        if (
          err?.code === 11000
        ) {
          const existingLoan =
            await DebtLoan.findOne({
              owner:
                req.ownerId,

              branch:
                req.branchId,

              syncId
            }).lean();

          if (existingLoan) {
            return res.status(200).json({
              success: true,
              alreadySynced: true,
              loan:
                existingLoan
            });
          }
        }

        throw err;

      } finally {
        await session.endSession();
      }

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };

const getLoanHistory =
  async (req, res) => {
    try {

      const page =
        Number(
          req.query.page || 1
        );

      const limit = 5000;

  const loans =
  await DebtLoan.find({
    owner: req.ownerId,
    branch: req.branchId,
    status: {
      $ne: "cancelled"
    }
  })
          .populate(
            "customer",
            "fullName phone"
          )
          .sort({
            createdAt: -1
          })
          .skip(
            (page - 1) * limit
          )
          .limit(limit)
          .lean();

      return res.status(200).json(
        loans
      );

    } catch (error) {

      return res.status(500).json({
        message:
          error.message
      });
    }
  };
 
// GET SINGLE LOAN
const getLoanById =
  async (req, res) => {
    try {
   const loan =
  await DebtLoan.findOne({
    _id: req.params.id,
    owner: req.ownerId,
    branch: req.branchId,
    status: {
      $ne: "cancelled"
    }
  })
    .populate(
      "customer",
      "fullName phone"
    )
    .lean();

      if (!loan) {
        return res.status(404).json({
          message:
            "Loan not found"
        });
      }

      return res.status(200).json(
        loan
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// OVERDUE
const getOverdueLoans =
  async (req, res) => {
    try {
    const loans =
  await DebtLoan.find({
    owner: req.ownerId,
    branch: req.branchId,
    status: "overdue"
  })
    .populate(
      "customer",
      "fullName phone"
    )
    .sort({
      dueDate: 1
    })
    .limit(100)
    .lean();

      return res.status(200).json(
        loans
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// SCAN FINGERPRINT
const scanFingerprint =
  async (req, res) => {
    try {
      const {
        fingerprintId
      } = req.body;

      if (!fingerprintId) {
        return res.status(400).json({
          message:
            "fingerprintId required"
        });
      }

       const customer =
  await CustomerIdentity.findOne({
    owner: req.ownerId,
    fingerprintId
  }).lean();

      if (!customer) {
        return res.status(200).json({
          found: false,
          message:
            "New customer"
        });
      }

     const activeLoans =
  await DebtLoan.find({
    owner: req.ownerId,
    branch: req.branchId,
    customer: customer._id,
    status: {
      $in: [
        "active",
        "overdue"
      ]
    }
  }).lean();

      return res.status(200).json({
        found: true,
        customer,
        loans:
          activeLoans
      });

    } catch (error) {
      return res.status(500).json({
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
        reference,
        transactionId
      } = req.body;

      if (!loanId) {
        return res.status(400).json({
          message:
            "Loan ID required"
        });
      }

       if (transactionId) {

  const existingPayment =
    await DebtPayment.findOne({
      owner: req.ownerId,
      branch: req.branchId,
      transactionId
    }).lean();

  if (existingPayment) {
    return res.status(409).json({
      message:
        "Malipo haya tayari yameshapokelewa"
    });
  }

}

    

      const loan =
        await DebtLoan.findOne({
          _id: loanId,
          owner: req.ownerId,
          branch: req.branchId
        }).lean();

      if (!loan) {
        return res.status(404).json({
          message:
            "Loan not found"
        });
      }

      if (
        loan.status === "paid"
      ) {
        return res.status(400).json({
          message:
            "This loan is already fully paid"
        });
      }

      if (
        loan.status ===
        "cancelled"
      ) {
        return res.status(400).json({
          message:
            "Cancelled loan cannot receive payment"
        });
      }

      const payAmount =
        Number(amount);

      // INVALID NUMBER
      if (
        isNaN(payAmount)
      ) {
        return res.status(400).json({
          message:
            "Invalid payment amount"
        });
      }

      // ZERO / NEGATIVE
      if (
        payAmount <= 0
      ) {
        return res.status(400).json({
          message:
            "Payment must be greater than zero"
        });
      }

      // OVERPAYMENT
      if (
        payAmount >
        loan.balanceAmount
      ) {
        return res.status(400).json({
          message:
            `Payment exceeds remaining balance of ${loan.balanceAmount}`
        });
      }

      const session =
        await mongoose.startSession();

      try {
        session.startTransaction();

        const newBalance =
          loan.balanceAmount -
          payAmount;

        const newStatus =
          newBalance === 0
            ? "paid"
            : loan.status;

        const updateResult =
          await DebtLoan.updateOne(
            {
              _id: loanId,
              owner: req.ownerId,
              branch: req.branchId,
              balanceAmount: {
                $gte: payAmount
              },
              status: {
                $nin: [
                  "paid",
                  "cancelled"
                ]
              }
            },
            {
              $inc: {
                paidAmount:
                  payAmount,
                balanceAmount:
                  -payAmount
              },
              $set: {
                lastPaymentDate:
                  new Date(),
                status:
                  newStatus
              }
            },
            {
              session
            }
          );

        if (
          updateResult.modifiedCount === 0
        ) {
          await session.abortTransaction();

          return res.status(400).json({
            message:
              "Payment could not be processed. Balance may have changed."
          });
        }

        await DebtPayment.create(
          [
            {
              owner:
                req.ownerId,
              branch:
                req.branchId,
              loan:
                loan._id,
              customer:
                loan.customer,
              amount:
                payAmount,
              paymentMethod:
                paymentMethod ||
                "cash",
              reference:
                reference || "",
              transactionId,
              receivedBy:
                req.user.id
            }
          ],
          {
            session
          }
        );

        if (newStatus === "paid") {
          await CustomerIdentity.findByIdAndUpdate(
            loan.customer,
            {
              $inc: {
                activeLoans: -1,
                paidLoans: 1,
                totalPaid:
                  payAmount
              }
            },
            {
              session
            }
          );
        } else {
          await CustomerIdentity.findByIdAndUpdate(
            loan.customer,
            {
              $inc: {
                totalPaid:
                  payAmount
              }
            },
            {
              session
            }
          );
        }

        await session.commitTransaction();

        const updatedLoan =
          await DebtLoan.findById(
            loanId
          ).lean();

        return res.status(200).json(
          updatedLoan
        );

      } catch (err) {

        if (
          err?.code === 11000
        ) {

          if (
            session.inTransaction()
          ) {
            await session.abortTransaction();
          }

          return res.status(409).json({
            message:
              "Malipo haya tayari yameshapokelewa"
          });
        }

        if (
          session.inTransaction()
        ) {
          await session.abortTransaction();
        }

        throw err;

      } finally {
        await session.endSession();
      }

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };
 // REFUND PAYMENT
const refundPayment =
  async (req, res) => {
    try {

      const {
        loanId,
        amount
      } = req.body;

      if (!loanId) {
        return res.status(400).json({
          message:
            "Loan ID required"
        });
      }

      const refundAmount =
        Number(amount);

      if (
        isNaN(refundAmount) ||
        refundAmount <= 0
      ) {
        return res.status(400).json({
          message:
            "Kiasi cha refund si sahihi"
        });
      }

      const loan =
        await DebtLoan.findOne({
          _id: loanId,
          owner: req.ownerId,
          branch: req.branchId
        });

      if (!loan) {
        return res.status(404).json({
          message:
            "Deni halijapatikana"
        });
      }

      if (
        refundAmount >
        loan.paidAmount
      ) {
        return res.status(400).json({
          message:
            "Kiasi cha refund kinazidi kilicholipwa"
        });
      }

      const session =
        await mongoose.startSession();

      try {

        session.startTransaction();

        loan.paidAmount -=
          refundAmount;

        loan.balanceAmount +=
          refundAmount;

        if (
          loan.status ===
          "paid"
        ) {
          loan.status =
            "active";

          await CustomerIdentity.findByIdAndUpdate(
            loan.customer,
            {
              $inc: {
                activeLoans: 1,
                paidLoans: -1,
                totalPaid:
                  -refundAmount
              }
            },
            {
              session
            }
          );
        } else {

          await CustomerIdentity.findByIdAndUpdate(
            loan.customer,
            {
              $inc: {
                totalPaid:
                  -refundAmount
              }
            },
            {
              session
            }
          );
        }

        await loan.save({
          session
        });

        // 🔥 HIFADHI REFUND KWENYE PAYMENT HISTORY
        await DebtPayment.create(
          [
            {
              owner:
                req.ownerId,

              branch:
                req.branchId,

              loan:
                loan._id,

              customer:
                loan.customer,

              amount:
                -refundAmount,

              paymentMethod:
                "cash",

              reference:
                "REFUND",

              note:
                "Malipo yamerudishwa kwenye deni",

              receivedBy:
                req.user.id,

              status:
                "reversed"
            }
          ],
          {
            session
          }
        );

        await session.commitTransaction();

        return res.status(200).json(
          loan
        );

      } catch (err) {

        if (
          session.inTransaction()
        ) {
          await session.abortTransaction();
        }

        throw err;

      } finally {

        await session.endSession();

      }

    } catch (error) {

      return res.status(500).json({
        message:
          error.message
      });

    }
  };
 
  const getPaymentHistory =
  async (req, res) => {
    try {
      const { loanId } =
        req.params;

    const payments =
  await DebtPayment.find({
    owner: req.ownerId,
    branch: req.branchId,
    loan: loanId,
    status: {
      $in: [
        "posted",
        "reversed"
      ]
    }
  })
    .populate(
      "receivedBy",
      "name"
    )
    .sort({
      paymentDate: -1
    })
    .limit(100)
    .lean();

      return res.status(200).json(
        payments
      );
    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


  const scanDebtsFromImage =
  async (req, res) => {
    try {

      if (!req.file) {
        return res.status(400).json({
          message: "Image required"
        });
      }

      const text =
        await readDebtImage(
          req.file
        );
 
        const rows =
  text
    .split("\n")
    .filter(Boolean)
    .map((row) => {

      const [
        name,
        amount,
        days
      ] = row
        .split("|")
        .map((v) =>
          v.trim()
        );

      if (
        !name ||
        isNaN(Number(amount)) ||
        isNaN(Number(days))
      ) {
        return null;
      }

      return {
        name,
        amount:
          Number(amount),
        days:
          Number(days)
      };
    })
    .filter(Boolean);
      return res.status(200).json({
        rows
      });

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };

  const importDebts =
  async (req, res) => {
    try {

      const { rows } =
        req.body;

      if (
        !Array.isArray(rows) ||
        rows.length === 0
      ) {
        return res.status(400).json({
          message:
            "Rows required"
        });
      }

      const imported = [];

      for (const row of rows) {

 const name =
  row.name
    ?.trim()
    .toUpperCase();

        const amount =
          Number(row.amount);

        const days =
          Number(row.days);

        if (
          !name ||
          amount <= 0
        ) {
          continue;
        }

        let customer =
          await CustomerIdentity.findOne({
            owner:
              req.ownerId,
            fullName: name
          });

        if (!customer) {
          customer =
            await CustomerIdentity.create({
              owner:
                req.ownerId,
              createdBy:
                req.user.id,
              fullName: name
            });
        }

        const dueDate =
          new Date();

        dueDate.setDate(
          dueDate.getDate() +
          (days || 30)
        );

        const loan =
          await DebtLoan.create({
            owner:
              req.ownerId,
            branch:
              req.branchId,
            createdBy:
              req.user.id,

            customer:
              customer._id,

            loanNumber:
              "LN" +
              Date.now() +
              Math.floor(
                Math.random() *
                10000
              ),

            principalAmount:
              amount,

            balanceAmount:
              amount,

            paidAmount: 0,

            dueDate,

            items: [],

            note:
              "Imported from debt notebook",

            approvedBy:
              req.user.id
          });

        imported.push(
          loan._id
        );
      }

      return res.status(201).json({
        success: true,
        count:
          imported.length
      });

    } catch (error) {

      return res.status(500).json({
        message:
          error.message
      });

    }
  };

  // DELETE LOAN
const deleteDebtLoan =
  async (req, res) => {
    try {

      const loan =
        await DebtLoan.findOne({
          _id: req.params.id,
          owner: req.ownerId,
          branch: req.branchId
        });

      if (!loan) {
        return res.status(404).json({
          message:
            "Deni halijapatikana"
        });
      }

      if (
        loan.status === "paid"
      ) {
        return res.status(400).json({
          message:
            "Deni lililolipwa kikamilifu haliwezi kufutwa"
        });
      }

      if (
        loan.status === "cancelled"
      ) {
        return res.status(400).json({
          message:
            "Deni hili tayari limefutwa"
        });
      }

      loan.status =
        "cancelled";

      await loan.save();

      await CustomerIdentity.findByIdAndUpdate(
        loan.customer,
        {
          $inc: {
            activeLoans: -1
          }
        }
      );

      return res.status(200).json({
        success: true,
        message:
          "Deni limefutwa kikamilifu"
      });

    } catch (error) {

      return res.status(500).json({
        message:
          error.message
      });

    }
  };
module.exports = {
  findOrCreateCustomer,
  checkCredit,
  deleteDebtLoan,
  createDebtLoan,
    syncLoan,
  getLoanHistory,
  getLoanById,
  receivePayment,
  scanFingerprint,
 getPaymentHistory,
 scanDebtsFromImage,
 importDebts,
 refundPayment,
   getOverdueLoans
};
