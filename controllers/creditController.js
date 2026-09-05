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

 // ====================================
// SYNC OFFLINE LOAN
// ====================================

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


      // ====================================
      // REQUIRED FIELDS
      // ====================================

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


      // ====================================
      // VERIFY CUSTOMER FIRST
      // ====================================

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


      // ====================================
      // CHECK DUPLICATE SYNC
      // ====================================

      const existingLoan =
        await DebtLoan.findOne({

          owner:
            req.ownerId,

          branch:
            req.branchId,

          syncId

        })
        .populate(
          "customer",
          "fullName phone"
        )
        .lean();


      if (existingLoan) {

        return res.status(200).json({

          success: true,

          alreadySynced: true,

          loan:
            existingLoan

        });

      }


      // ====================================
      // CREATE SERVER LOAN
      // ====================================

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

                approvedBy:
                  null,

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

                status:
                  "active"

              }
            ],
            {
              session
            }
          );


        // ====================================
        // UPDATE CUSTOMER COUNTERS
        // ====================================

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


        // ====================================
        // COMMIT
        // ====================================

        await session.commitTransaction();


        // ====================================
        // GET CREATED LOAN WITH CUSTOMER
        // ====================================

        const syncedLoan =
          await DebtLoan.findById(
            loan[0]._id
          )
          .populate(
            "customer",
            "fullName phone"
          )
          .lean();


        // ====================================
        // RESPONSE
        // ====================================

        return res.status(201).json({

          success: true,

          alreadySynced: false,

          loan:
            syncedLoan

        });


      } catch (err) {

        if (
          session.inTransaction()
        ) {

          await session.abortTransaction();

        }


        // ====================================
        // DUPLICATE syncId
        // ====================================

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

            })
            .populate(
              "customer",
              "fullName phone"
            )
            .lean();


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

      console.error(
        "❌ SYNC OFFLINE LOAN ERROR:",
        error
      );

      return res.status(500).json({

        message:
          error.message

      });

    }

  };
// ====================================
// GET ALL LOANS FOR RECOVERY
//
// HII ENDPOINT NI MAALUM KWA DATA RECOVERY.
//
// HAIBADILISHI DATA.
//
// INARUDISHA LOAN ZOTE ZA BRANCH
// ILI RECOVERY IFUATILIE:
//
// LOAN CREATED
//      ↓
// PAYMENTS
//      ↓
// REFUNDS / REVERSALS
//      ↓
// FINAL BALANCE
// ====================================

const getAllLoansForRecovery =
  async (req, res) => {

    try {

      // ====================================
      // GET ALL LOANS
      //
      // IMPORTANT:
      //
      // HATUFILTER KWA:
      //
      // active
      // overdue
      // paid
      // balance
      //
      // TUNATAKA HISTORY YOTE.
      // ====================================

      const loans =
        await DebtLoan.find({
          owner: req.ownerId,
          branch: req.branchId
        })
          .populate(
            "customer",
            "fullName phone"
          )
          .sort({
            createdAt: 1
          })
          .lean();


      // ====================================
      // NORMALIZE LOANS FOR RECOVERY
      // ====================================

      const normalizedLoans =
        loans.map(
          (loan) => {

            const loanId =
              loan.loanId ||
              String(
                loan._id
              );


            const syncId =
              loan.syncId ||
              loan.loanSyncId ||
              null;


            return {

              // =================================
              // ORIGINAL DATA
              // =================================

              ...loan,


              // =================================
              // NORMALIZED ID
              // =================================

              loanId:
                String(
                  loanId
                ),


              // =================================
              // BACKEND ID
              // =================================

              backendLoanId:
                String(
                  loan._id
                ),


              // =================================
              // SYNC ID
              // =================================

              syncId:
                syncId
                  ? String(
                      syncId
                    )
                  : null,


              // =================================
              // NORMALIZED AMOUNTS
              // =================================

              principalAmount:
                Number(
                  loan.principalAmount ||
                  loan.amount ||
                  0
                ),


              paidAmount:
                Number(
                  loan.paidAmount ||
                  0
                ),


              balanceAmount:
                Number(
                  loan.balanceAmount ||
                  loan.remainingAmount ||
                  0
                ),


              // =================================
              // STATUS
              // =================================

              status:
                String(
                  loan.status ||
                  "unknown"
                )
                  .trim()
                  .toLowerCase()

            };

          }
        );

 
// ====================================
// APPLY LOAN RECOVERY
//
// HII ENDPOINT:
// - haifuti loan
// - haifuti payment history
// - haibadilishi principalAmount
//
// INA UPDATE TU:
//
// paidAmount
// balanceAmount
// status
//
// DATA INATOKA KWENYE SQLITE
// AMBAYO TAYARI IMERECOVER
// KWA KUTUMIA PAYMENT HISTORY.
// ====================================

const applyLoanRecovery =
  async (req, res) => {

    try {

      // ====================================
      // REQUEST DATA
      // ====================================

      const {
        loans
      } = req.body;


      // ====================================
      // VALIDATE
      // ====================================

      if (
        !Array.isArray(
          loans
        )
      ) {

        return res.status(400).json({

          message:
            "loans must be an array"

        });

      }


      if (
        loans.length === 0
      ) {

        return res.status(200).json({

          success:
            true,

          total:
            0,

          updated:
            0,

          failed:
            0,

          results:
            []

        });

      }


      console.log(
        "\n🛠️ ===================================="
      );

      console.log(
        "🛠️ APPLYING BACKEND LOAN RECOVERY"
      );

      console.log(
        "🛠️ ===================================="
      );

      console.log({

        ownerId:
          req.ownerId,

        branchId:
          req.branchId,

        total:
          loans.length

      });


      // ====================================
      // COUNTERS
      // ====================================

      let updated =
        0;

      let failed =
        0;


      const results =
        [];


      // ====================================
      // PROCESS LOANS
      // ====================================

      for (
        const recoveryLoan
        of loans
      ) {

        try {

          // ==================================
          // NORMALIZE IDS
          // ==================================

          const loanId =
            String(
              recoveryLoan?.loanId ||
              ""
            ).trim();


          const syncId =
            String(
              recoveryLoan?.syncId ||
              ""
            ).trim();


          const backendLoanId =
            String(
              recoveryLoan?.backendLoanId ||
              ""
            ).trim();


          // ==================================
          // LOAN MUST HAVE ID
          // ==================================

          if (
            !loanId &&
            !syncId &&
            !backendLoanId
          ) {

            throw new Error(
              "Loan has no identifier"
            );

          }


          // ==================================
          // NORMALIZE AMOUNTS
          // ==================================

          const paidAmount =
            Math.max(

              0,

              Number(
                recoveryLoan?.paidAmount ||
                recoveryLoan?.recoveredPaidAmount ||
                0
              )

            );


          const balanceAmount =
            Math.max(

              0,

              Number(
                recoveryLoan?.balanceAmount ??
                recoveryLoan?.recoveredBalanceAmount ??
                0
              )

            );


          // ==================================
          // NORMALIZE STATUS
          // ==================================

          const status =
            String(

              recoveryLoan?.status ||
              recoveryLoan?.recoveredStatus ||
              "active"

            )
              .trim()
              .toLowerCase();


          // ==================================
          // FIND LOAN
          //
          // SECURITY:
          //
          // owner + branch lazima
          // zilingane.
          // ==================================

          const orConditions =
            [];


          if (
            backendLoanId
          ) {

            orConditions.push({

              _id:
                backendLoanId

            });

          }


          if (
            loanId
          ) {

            orConditions.push({

              loanId:
                loanId

            });

          }


          if (
            syncId
          ) {

            orConditions.push({

              syncId:
                syncId

            });

          }


          const loan =
            await DebtLoan.findOne({

              owner:
                req.ownerId,

              branch:
                req.branchId,

              $or:
                orConditions

            });


          // ==================================
          // NOT FOUND
          // ==================================

          if (
            !loan
          ) {

            throw new Error(
              `Backend loan not found: loanId=${loanId}, syncId=${syncId}`
            );

          }


          // ==================================
          // CURRENT DATA
          // ==================================

          const before = {

            paidAmount:
              Number(
                loan.paidAmount ||
                0
              ),

            balanceAmount:
              Number(
                loan.balanceAmount ||
                loan.remainingAmount ||
                0
              ),

            status:
              String(
                loan.status ||
                ""
              )

          };


          // ==================================
          // APPLY RECOVERY
          // ==================================

          loan.paidAmount =
            paidAmount;


          loan.balanceAmount =
            balanceAmount;


          loan.status =
            status;


          await loan.save();


          // ==================================
          // VERIFY
          // ==================================

          const verifiedLoan =
            await DebtLoan.findOne({

              _id:
                loan._id,

              owner:
                req.ownerId,

              branch:
                req.branchId

            })
              .lean();


          if (
            !verifiedLoan
          ) {

            throw new Error(
              "Loan disappeared after update"
            );

          }


          const verifiedPaidAmount =
            Number(
              verifiedLoan.paidAmount ||
              0
            );


          const verifiedBalanceAmount =
            Number(
              verifiedLoan.balanceAmount ||
              verifiedLoan.remainingAmount ||
              0
            );


          const verifiedStatus =
            String(
              verifiedLoan.status ||
              ""
            )
              .trim()
              .toLowerCase();


          // ==================================
          // VERIFY AMOUNTS
          // ==================================

          if (

            Math.abs(

              verifiedPaidAmount -
              paidAmount

            ) > 0.01 ||

            Math.abs(

              verifiedBalanceAmount -
              balanceAmount

            ) > 0.01 ||

            verifiedStatus !==
            status

          ) {

            throw new Error(
              "Backend recovery verification failed"
            );

          }


          // ==================================
          // SUCCESS
          // ==================================

          updated++;


          const result = {

            success:
              true,

            loanId,

            syncId,

            backendLoanId:
              String(
                loan._id
              ),

            before,

            after: {

              paidAmount,

              balanceAmount,

              status

            }

          };


          results.push(
            result
          );


          console.log(
            "✅ BACKEND LOAN RECOVERED:",
            result
          );


        } catch (
          error
        ) {

          failed++;


          const failedResult = {

            success:
              false,

            loanId:

              recoveryLoan?.loanId ||
              "",

            syncId:

              recoveryLoan?.syncId ||
              "",

            error:
              error.message

          };


          results.push(
            failedResult
          );


          console.error(
            "❌ BACKEND LOAN RECOVERY FAILED:",
            failedResult
          );

        }

      }


      // ====================================
      // FINAL RESPONSE
      // ====================================

      const response = {

        success:
          failed === 0,

        total:
          loans.length,

        updated,

        failed,

        results

      };


      console.log(
        "\n🛠️ ===================================="
      );

      console.log(
        "🛠️ BACKEND LOAN RECOVERY FINISHED"
      );

      console.log(
        response
      );

      console.log(
        "🛠️ ====================================\n"
      );


      return res.status(200).json(
        response
      );


    } catch (
      error
    ) {

      console.error(
        "❌ APPLY BACKEND LOAN RECOVERY ERROR:",
        error
      );


      return res.status(500).json({

        message:
          error.message

      });

    }

  };
 


      // ====================================
      // RECOVERY SUMMARY
      // ====================================

      const statusSummary =
        normalizedLoans.reduce(
          (
            result,
            loan
          ) => {

            const status =
              loan.status ||
              "unknown";


            result[status] =
              (
                result[status] ||
                0
              ) + 1;


            return result;

          },
          {}
        );


      console.log(
        "📚 ALL BACKEND LOANS FOR RECOVERY:",
        {

          ownerId:
            req.ownerId,

          branchId:
            req.branchId,

          total:
            normalizedLoans.length,

          statuses:
            statusSummary

        }
      );


      // ====================================
      // RETURN
      //
      // READ ONLY
      // ====================================

      return res.status(200).json(
        normalizedLoans
      );

    } catch (
      error
    ) {

      console.error(
        "❌ GET ALL LOANS FOR RECOVERY ERROR:",
        error
      );


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


      // ====================================
      // GET LOANS
      //
      // HII QUERY INABAKI SAWA
      // ILI APP YA ZAMANI ISIBADILIWE
      // ====================================

      const loans =
        await DebtLoan.find({
          owner: req.ownerId,
          branch: req.branchId,
          status: {
         $in: [
          "active",
        "overdue"
       ]
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


      // ====================================
      // NORMALIZE LOANS FOR SYNC
      //
      // HII HAIBADILISHI LOAN DATA
      // INAONGEZA TU syncId KAMA IPO
      // ====================================

      const normalizedLoans =
        loans.map(
          (loan) => {

            return {

              // --------------------------------
              // DATA ZOTE ZA ZAMANI ZINABAKI
              // --------------------------------

              ...loan,


              // --------------------------------
              // ENSURE loanId EXISTS
              //
              // APP MPYA INAWEZA KUTUMIA
              // loanId BADALA YA _id
              //
              // APP YA ZAMANI BADO ITATUMIA _id
              // --------------------------------

              loanId:
                loan.loanId ||
                String(loan._id),


              // --------------------------------
              // ENSURE syncId
              //
              // KAMA DATABASE INA syncId,
              // ITATUMIKA.
              //
              // KAMA HAINA, HATUBADILISHI
              // RECORD YA DATABASE.
              // --------------------------------

              syncId:
                loan.syncId ||
                loan.loanSyncId ||
                undefined,

            };

          }
        );


      // ====================================
      // RESPONSE FORMAT INABAKI ARRAY
      //
      // APP YA ZAMANI HAITAVUNJIKA
      // ====================================

      return res.status(200).json(
        normalizedLoans
      );

    } catch (error) {

      console.error(
        "❌ GET LOAN HISTORY ERROR:",
        error
      );

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

 // ====================================
// SYNC OFFLINE PAYMENT
// ====================================
 
 const syncPayment = async (req, res) => {

  let session = null;

  try {

    const {
      loanId,
      loanSyncId,
      amount,
      paymentMethod,
      reference,
      transactionId,
      syncId,
      deviceId,
      paymentDate
    } = req.body;


    // ====================================
    // VALIDATION
    // ====================================

    if (!loanId && !loanSyncId) {

      return res.status(400).json({
        success: false,
        message:
          "Loan ID or loanSyncId required"
      });

    }


    if (!syncId) {

      return res.status(400).json({
        success: false,
        message:
          "syncId required"
      });

    }


    if (!deviceId) {

      return res.status(400).json({
        success: false,
        message:
          "deviceId required"
      });

    }


    const payAmount =
      Number(amount);


    if (
      !Number.isFinite(payAmount) ||
      payAmount <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Valid payment amount required"
      });

    }


    // ====================================
    // NORMALIZE REFERENCES
    // ====================================

    const normalizedLoanId =
      loanId
        ? String(loanId).trim()
        : "";


    const normalizedLoanSyncId =
      loanSyncId
        ? String(loanSyncId).trim()
        : "";


    const normalizedSyncId =
      String(syncId).trim();


    const normalizedTransactionId =
      transactionId
        ? String(transactionId).trim()
        : "";


    // ====================================
    // CHECK DUPLICATE syncId
    // ====================================

    const existingPayment =
      await DebtPayment.findOne({

        owner:
          req.ownerId,

        branch:
          req.branchId,

        syncId:
          normalizedSyncId

      }).lean();


    if (existingPayment) {

      const existingLoan =
        await DebtLoan.findOne({

          _id:
            existingPayment.loan,

          owner:
            req.ownerId,

          branch:
            req.branchId

        }).lean();


      return res.status(200).json({

        success: true,

        alreadySynced: true,

        payment:
          existingPayment,

        loan:
          existingLoan
            ? {

                _id:
                  existingLoan._id,

                syncId:
                  existingLoan.syncId ||
                  null,

                balanceAmount:
                  Number(
                    existingLoan.balanceAmount || 0
                  ),

                paidAmount:
                  Number(
                    existingLoan.paidAmount || 0
                  ),

                status:
                  existingLoan.status

              }
            : null

      });

    }


    // ====================================
    // CHECK DUPLICATE transactionId
    // ====================================

    if (normalizedTransactionId) {

      const existingTransaction =
        await DebtPayment.findOne({

          owner:
            req.ownerId,

          branch:
            req.branchId,

          transactionId:
            normalizedTransactionId

        }).lean();


      if (existingTransaction) {

        const existingLoan =
          await DebtLoan.findOne({

            _id:
              existingTransaction.loan,

            owner:
              req.ownerId,

            branch:
              req.branchId

          }).lean();


        return res.status(200).json({

          success: true,

          alreadySynced: true,

          payment:
            existingTransaction,

          loan:
            existingLoan
              ? {

                  _id:
                    existingLoan._id,

                  syncId:
                    existingLoan.syncId ||
                    null,

                  balanceAmount:
                    Number(
                      existingLoan.balanceAmount || 0
                    ),

                  paidAmount:
                    Number(
                      existingLoan.paidAmount || 0
                    ),

                  status:
                    existingLoan.status

                }
              : null

        });

      }

    }


    // ====================================
    // FIND LOAN
    // ====================================
    //
    // MUHIMU:
    //
    // Tunatafuta kwa loanId AU loanSyncId.
    //
    // Hii inasaidia pale ambapo:
    //
    // 1. loanId ya local ni ya zamani
    // 2. loanSyncId bado ni sahihi
    //
    // Pia tunalinda owner + branch.
    //
    // ====================================

    const loanOrConditions = [];


    // ====================================
    // ADD loanId ONLY IF VALID ObjectId
    // ====================================

    if (
      normalizedLoanId &&
      mongoose.Types.ObjectId.isValid(
        normalizedLoanId
      )
    ) {

      loanOrConditions.push({
        _id:
          normalizedLoanId
      });

    }


    // ====================================
    // ADD loanSyncId
    // ====================================

    if (
      normalizedLoanSyncId
    ) {

      loanOrConditions.push({
        syncId:
          normalizedLoanSyncId
      });

    }


    // ====================================
    // NO VALID SEARCH REFERENCE
    // ====================================

    if (
      loanOrConditions.length === 0
    ) {

      return res.status(404).json({

        success: false,

        message:
          "Loan not found"

      });

    }


    // ====================================
    // DEBUG LOAN SEARCH
    // ====================================

    console.log(
      "🔍 SYNC PAYMENT LOAN SEARCH:",
      {
        loanId:
          normalizedLoanId || null,

        loanSyncId:
          normalizedLoanSyncId || null,

        ownerId:
          req.ownerId,

        branchId:
          req.branchId,

        searchBy:
          loanOrConditions.map(
            condition =>
              Object.keys(condition)[0]
          )
      }
    );


    // ====================================
    // FIND LOAN BY ID OR syncId
    // ====================================

    const loan =
      await DebtLoan.findOne({

        owner:
          req.ownerId,

        branch:
          req.branchId,

        $or:
          loanOrConditions

      }).lean();


    // ====================================
    // LOAN NOT FOUND
    // ====================================

    if (!loan) {

      console.error(
        "❌ LOAN NOT FOUND DURING PAYMENT SYNC:",
        {
          loanId:
            normalizedLoanId || null,

          loanSyncId:
            normalizedLoanSyncId || null,

          ownerId:
            req.ownerId,

          branchId:
            req.branchId
        }
      );


      return res.status(404).json({

        success: false,

        message:
          "Loan not found"

      });

    }


    // ====================================
    // LOAN FOUND
    // ====================================

    console.log(
      "✅ LOAN FOUND FOR PAYMENT SYNC:",
      {
        loanId:
          loan._id,

        loanSyncId:
          loan.syncId || null,

        balanceAmount:
          Number(
            loan.balanceAmount || 0
          ),

        paidAmount:
          Number(
            loan.paidAmount || 0
          ),

        status:
          loan.status
      }
    );


    // ====================================
    // CHECK LOAN STATUS
    // ====================================

    if (
      loan.status ===
      "cancelled"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "Cancelled loan cannot receive payment"

      });

    }


    // ====================================
    // ALREADY FULLY PAID
    // ====================================

    if (
      loan.status ===
      "paid"
    ) {

      return res.status(400).json({

        success: false,

        message:
          "This loan is already fully paid"

      });

    }


    // ====================================
    // CURRENT BALANCE
    // ====================================

    const currentBalance =
      Number(
        loan.balanceAmount || 0
      );


    // ====================================
    // PREVENT OVERPAYMENT
    // ====================================

    if (
      payAmount >
      currentBalance
    ) {

      return res.status(400).json({

        success: false,

        message:
          `Payment exceeds remaining balance of ${currentBalance}`

      });

    }


    // ====================================
    // START TRANSACTION
    // ====================================

    session =
      await mongoose.startSession();

    session.startTransaction();


    // ====================================
    // CALCULATE NEW VALUES
    // ====================================

    const oldBalance =
      Number(
        loan.balanceAmount || 0
      );


    const oldPaid =
      Number(
        loan.paidAmount || 0
      );


    const newBalance =
      oldBalance -
      payAmount;


    const newPaid =
      oldPaid +
      payAmount;


    const newStatus =
      newBalance <= 0
        ? "paid"
        : loan.status;


    // ====================================
    // UPDATE LOAN
    // ====================================

    const updateResult =
      await DebtLoan.updateOne(

        {
          _id:
            loan._id,

          owner:
            req.ownerId,

          branch:
            req.branchId,

          balanceAmount: {
            $gte:
              payAmount
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
              paymentDate
                ? new Date(
                    paymentDate
                  )
                : new Date(),

            status:
              newStatus

          }

        },

        {
          session
        }

      );


    // ====================================
    // LOAN UPDATE FAILED
    // ====================================

    if (
      updateResult.modifiedCount ===
      0
    ) {

      await session.abortTransaction();

      return res.status(400).json({

        success: false,

        message:
          "Payment could not be processed. Balance may have changed."

      });

    }


    // ====================================
    // CREATE PAYMENT
    // ====================================

    const payment =
      await DebtPayment.create(

        [

          {

            loan:
              loan._id,

            customer:
              loan.customer,

            owner:
              req.ownerId,

            branch:
              req.branchId,

            amount:
              payAmount,

            paymentDate:
              paymentDate
                ? new Date(
                    paymentDate
                  )
                : new Date(),

            paymentMethod:
              paymentMethod ||
              "cash",

            channel:
              "offline_sync",

            reference:
              reference ||
              "",

            transactionId:
              normalizedTransactionId ||
              null,

            receivedBy:
              req.user.id,

            // ====================================
            // OFFLINE SYNC DATA
            // ====================================

            syncId:
              normalizedSyncId,

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

            status:
              "posted"

          }

        ],

        {
          session
        }

      );


    // ====================================
    // UPDATE CUSTOMER
    // ====================================

    if (
      newStatus ===
      "paid"
    ) {

      await CustomerIdentity.findByIdAndUpdate(

        loan.customer,

        {

          $inc: {

            activeLoans:
              -1,

            paidLoans:
              1,

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


    // ====================================
    // COMMIT TRANSACTION
    // ====================================

    await session.commitTransaction();


    // ====================================
    // RETURN SUCCESS
    // ====================================

    return res.status(200).json({

      success: true,

      alreadySynced: false,

      payment:
        payment[0],

      loan: {

        _id:
          loan._id,

        syncId:
          loan.syncId ||
          null,

        balanceAmount:
          newBalance,

        paidAmount:
          newPaid,

        status:
          newStatus

      }

    });


  } catch (error) {

    // ====================================
    // ABORT TRANSACTION
    // ====================================

    if (
      session &&
      session.inTransaction()
    ) {

      await session.abortTransaction();

    }


    // ====================================
    // DUPLICATE KEY PROTECTION
    // ====================================

    if (
      error?.code ===
      11000
    ) {

      const existingPayment =
        await DebtPayment.findOne({

          owner:
            req.ownerId,

          branch:
            req.branchId,

          $or: [

            {
              syncId:
                normalizedSyncId
            },

            ...(normalizedTransactionId
              ? [
                  {
                    transactionId:
                      normalizedTransactionId
                  }
                ]
              : [])

          ]

        }).lean();


      if (existingPayment) {

        const existingLoan =
          await DebtLoan.findOne({

            _id:
              existingPayment.loan,

            owner:
              req.ownerId,

            branch:
              req.branchId

          }).lean();


        return res.status(200).json({

          success: true,

          alreadySynced: true,

          payment:
            existingPayment,

          loan:
            existingLoan
              ? {

                  _id:
                    existingLoan._id,

                  syncId:
                    existingLoan.syncId ||
                    null,

                  balanceAmount:
                    Number(
                      existingLoan.balanceAmount || 0
                    ),

                  paidAmount:
                    Number(
                      existingLoan.paidAmount || 0
                    ),

                  status:
                    existingLoan.status

                }
              : null

        });

      }

    }


    // ====================================
    // ERROR LOG
    // ====================================

    console.error(
      "❌ SYNC PAYMENT ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error?.message ||
        "Payment sync failed"

    });


  } finally {

    // ====================================
    // END SESSION
    // ====================================

    if (session) {

      await session.endSession();

    }

  }

};
// ====================================
// REFUND PAYMENT
// ====================================

const refundPayment = async (req, res) => {

  let session = null;

  try {

    const {
      loanId,
      amount
    } = req.body;


    // ====================================
    // VALIDATION
    // ====================================

    if (!loanId) {

      return res.status(400).json({
        success: false,
        message:
          "Loan ID required"
      });

    }


    if (
      !mongoose.Types.ObjectId.isValid(
        loanId
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Loan ID si sahihi"
      });

    }


    const refundAmount =
      Number(amount);


    if (
      !Number.isFinite(refundAmount) ||
      refundAmount <= 0
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Kiasi cha refund si sahihi"
      });

    }


    // ====================================
    // FIND LOAN
    // ====================================

    const loan =
      await DebtLoan.findOne({

        _id:
          loanId,

        owner:
          req.ownerId,

        branch:
          req.branchId

      });


    if (!loan) {

      return res.status(404).json({
        success: false,
        message:
          "Deni halijapatikana"
      });

    }


    // ====================================
    // VALIDATE PAID AMOUNT
    // ====================================

    const paidAmount =
      Number(
        loan.paidAmount || 0
      );


    if (refundAmount > paidAmount) {

      return res.status(400).json({
        success: false,
        message:
          `Kiasi cha refund kinazidi kilicholipwa. Kilicholipwa ni ${paidAmount}`
      });

    }


    // ====================================
    // START TRANSACTION
    // ====================================

    session =
      await mongoose.startSession();

    session.startTransaction();


    try {

      // ====================================
      // OLD STATUS
      // ====================================

      const oldStatus =
        loan.status;


      // ====================================
      // UPDATE LOAN AMOUNTS
      // ====================================

      loan.paidAmount =
        Number(
          loan.paidAmount || 0
        ) -
        refundAmount;


      loan.balanceAmount =
        Number(
          loan.balanceAmount || 0
        ) +
        refundAmount;


      // ====================================
      // PREVENT NEGATIVE PAID AMOUNT
      // ====================================

      if (
        loan.paidAmount < 0
      ) {

        throw new Error(
          "Paid amount haiwezi kuwa chini ya sifuri"
        );

      }


      // ====================================
      // IF LOAN WAS FULLY PAID
      // ====================================

      if (
        oldStatus === "paid"
      ) {

        loan.status =
          "active";


        await CustomerIdentity.findByIdAndUpdate(

          loan.customer,

          {
            $inc: {

              activeLoans:
                1,

              paidLoans:
                -1,

              totalPaid:
                -refundAmount

            }
          },

          {
            session
          }

        );

      } else {

        // ====================================
        // NORMAL ACTIVE / OVERDUE LOAN
        // ====================================

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


      // ====================================
      // SAVE LOAN
      // ====================================

      await loan.save({
        session
      });


      // ====================================
      // SAVE REFUND HISTORY
      // ====================================

      const refund =
        await DebtPayment.create(

          [
            {

              // --------------------------------
              // OWNERSHIP
              // --------------------------------

              owner:
                req.ownerId,

              branch:
                req.branchId,


              // --------------------------------
              // RELATIONS
              // --------------------------------

              loan:
                loan._id,

              customer:
                loan.customer,


              // --------------------------------
              // REFUND AMOUNT
              // --------------------------------

              amount:
                -refundAmount,


              // --------------------------------
              // IMPORTANT
              // REFUND TYPE
              // --------------------------------

              type:
                "refund",


              // --------------------------------
              // PAYMENT INFORMATION
              // --------------------------------

              paymentDate:
                new Date(),

              paymentMethod:
                "cash",

              // IMPORTANT:
              // "online" haipo kwenye schema yako.
              // Tunatumia "app".
              channel:
                "app",

              reference:
                "REFUND",

              note:
                "Malipo yamerudishwa kwenye deni",


              // --------------------------------
              // USER
              // --------------------------------

              receivedBy:
                req.user.id,


              // --------------------------------
              // STATUS
              // --------------------------------

              status:
                "reversed",


              // --------------------------------
              // SOURCE
              // --------------------------------

              source:
                "online",

              syncStatus:
                "synced",

              lastSyncedAt:
                new Date(),

              syncError:
                "",

              queuedAt:
                null,

              syncId:
                null,

              deviceId:
                null

            }

          ],

          {
            session
          }

        );


      // ====================================
      // COMMIT
      // ====================================

      await session.commitTransaction();


      // ====================================
      // GET UPDATED LOAN
      // ====================================

      const updatedLoan =
        await DebtLoan.findOne({

          _id:
            loan._id,

          owner:
            req.ownerId,

          branch:
            req.branchId

        })
          .populate(
            "customer",
            "fullName phone"
          )
          .lean();


      // ====================================
      // SUCCESS RESPONSE
      // ====================================

      return res.status(200).json({

        success: true,

        message:
          "Refund imehifadhiwa kikamilifu",

        refund:
          refund[0],

        loan:
          updatedLoan

      });


    } catch (err) {

      // ====================================
      // ABORT TRANSACTION
      // ====================================

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

    console.error(
      "❌ REFUND PAYMENT ERROR:",
      error
    );


    return res.status(500).json({

      success: false,

      message:
        error?.message ||
        "Refund imeshindikana"

    });

  }

};
 


  // ====================================
// SYNC OFFLINE REFUND
// ====================================

const syncRefund = async (req, res) => {
  try {

    const {
      loanId,
      loanSyncId,
      amount,
      syncId,
      deviceId,
      paymentDate
    } = req.body;

    // --------------------------------
    // VALIDATION
    // --------------------------------

    if (!loanId && !loanSyncId) {
      return res.status(400).json({
        message:
          "Loan ID or loanSyncId required"
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

    const refundAmount =
      Number(amount);

    if (
      !refundAmount ||
      refundAmount <= 0
    ) {
      return res.status(400).json({
        message:
          "Kiasi cha refund si sahihi"
      });
    }

    // --------------------------------
    // CHECK DUPLICATE REFUND
    // --------------------------------

    const existingRefund =
      await DebtPayment.findOne({
        owner:
          req.ownerId,

        branch:
          req.branchId,

        syncId
      }).lean();

    if (existingRefund) {

      return res.status(200).json({

        success: true,

        alreadySynced: true,

        payment:
          existingRefund
      });
    }

    // --------------------------------
    // FIND LOAN
    // --------------------------------

    let loan = null;

    // Kama server MongoDB ID ipo
    if (loanId) {

      // Hakikisha si offline syncId
      if (
        mongoose.Types.ObjectId.isValid(
          loanId
        )
      ) {

        loan =
          await DebtLoan.findOne({
            _id:
              loanId,

            owner:
              req.ownerId,

            branch:
              req.branchId
          });
      }
    }

    // --------------------------------
    // FIND USING OFFLINE syncId
    // --------------------------------

    if (!loan && loanSyncId) {

      loan =
        await DebtLoan.findOne({
          owner:
            req.ownerId,

          branch:
            req.branchId,

          syncId:
            loanSyncId
        });
    }

    if (!loan) {

      return res.status(404).json({
        message:
          "Deni halijapatikana kwenye server"
      });
    }

    // --------------------------------
    // VALIDATE REFUND
    // --------------------------------

    if (
      refundAmount >
      loan.paidAmount
    ) {

      return res.status(400).json({
        message:
          "Kiasi cha refund kinazidi kilicholipwa"
      });
    }

    // --------------------------------
    // START TRANSACTION
    // --------------------------------

    const session =
      await mongoose.startSession();

    try {

      session.startTransaction();

      // --------------------------------
      // UPDATE LOAN
      // --------------------------------

      const oldStatus =
        loan.status;

      loan.paidAmount =
        loan.paidAmount -
        refundAmount;

      loan.balanceAmount =
        loan.balanceAmount +
        refundAmount;

      // --------------------------------
      // IF WAS PAID
      // --------------------------------

      if (
        oldStatus === "paid"
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

      // --------------------------------
      // SAVE LOAN
      // --------------------------------

      await loan.save({
        session
      });

    // --------------------------------
// SAVE REFUND HISTORY
// --------------------------------

const refund =
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

        // --------------------------------
        // REFUND AMOUNT
        // --------------------------------

        amount:
          -refundAmount,

        // --------------------------------
        // PAYMENT TYPE
        // --------------------------------

        type:
          "refund",

        paymentDate:
          paymentDate
            ? new Date(
                paymentDate
              )
            : new Date(),

        paymentMethod:
          "cash",

        channel:
          "offline_sync",

        reference:
          "REFUND",

        note:
          "Malipo yamerudishwa kwenye deni",

        receivedBy:
          req.user.id,

        // --------------------------------
        // OFFLINE SYNC
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

        // --------------------------------
        // STATUS
        // --------------------------------

        status:
          "reversed"
      }
    ],
    {
      session
    }
  );
      // --------------------------------
      // COMMIT
      // --------------------------------

      await session.commitTransaction();

      // --------------------------------
      // RESPONSE
      // --------------------------------

      return res.status(200).json({

        success: true,

        alreadySynced:
          false,

        refund:
          refund[0],

        loan: {

          _id:
            loan._id,

          syncId:
            loan.syncId,

          balanceAmount:
            loan.balanceAmount,

          paidAmount:
            loan.paidAmount,

          status:
            loan.status
        }

      });

    } catch (err) {

      if (
        session.inTransaction()
      ) {

        await session.abortTransaction();
      }

      // --------------------------------
      // DUPLICATE SYNC
      // --------------------------------

      if (
        err?.code === 11000
      ) {

        const existing =
          await DebtPayment.findOne({
            owner:
              req.ownerId,

            branch:
              req.branchId,

            syncId
          }).lean();

        if (existing) {

          return res.status(200).json({

            success: true,

            alreadySynced:
              true,

            payment:
              existing
          });
        }
      }

      throw err;

    } finally {

      await session.endSession();
    }

  } catch (error) {

    console.error(
      "❌ SYNC REFUND ERROR:",
      error
    );

    return res.status(500).json({
      message:
        error.message
    });
  }
};
 
 
// ====================================
// GET ALL PAYMENT HISTORY
// READ ONLY
//
// Hii endpoint:
// - haisemi loanId
// - haifuti data
// - haibadilishi data
// - haisync data
//
// Inarudisha payments zote
// za owner + branch husika.
// ====================================

const getAllPaymentHistory =
  async (req, res) => {

    try {

      console.log(
        "🔍 GETTING ALL BACKEND PAYMENT HISTORY..."
      );


      const payments =
        await DebtPayment.find({

          owner:
            req.ownerId,

          branch:
            req.branchId,

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

            paymentDate:
              -1,

            createdAt:
              -1

          })
          .lean();


      // ====================================
      // NORMALIZE PAYMENTS
      //
      // Hatubadilishi database.
      // Tunaandaa response tu.
      // ====================================

      const normalizedPayments =
        payments.map(
          (payment) => ({

            ...payment,

            paymentId:
              String(
                payment._id
              ),

            syncId:
              payment.syncId ||
              null,

            transactionId:
              payment.transactionId ||
              null,

            loanId:
              payment.loan
                ? String(
                    payment.loan
                  )
                : null,

          })
        );


      // ====================================
      // FIND DATE RANGE
      // ====================================

      const validDates =
        normalizedPayments
          .map(
            (payment) => {

              const rawDate =
                payment.paymentDate ||
                payment.createdAt ||
                null;


              if (
                !rawDate
              ) {

                return null;

              }


              const date =
                new Date(
                  rawDate
                );


              if (
                Number.isNaN(
                  date.getTime()
                )
              ) {

                return null;

              }


              return date;

            }
          )
          .filter(
            Boolean
          )
          .sort(
            (a, b) =>
              a.getTime() -
              b.getTime()
          );


      const oldestDate =
        validDates.length > 0
          ? validDates[0]
          : null;


      const newestDate =
        validDates.length > 0
          ? validDates[
              validDates.length - 1
            ]
          : null;


      // ====================================
      // SERVER LOG
      // ====================================

      console.log(
        "📥 ALL PAYMENT HISTORY RESPONSE:",
        {

          owner:
            String(
              req.ownerId
            ),

          branch:
            String(
              req.branchId
            ),

          count:
            normalizedPayments.length,

          oldestPayment:
            oldestDate
              ? oldestDate.toISOString()
              : null,

          newestPayment:
            newestDate
              ? newestDate.toISOString()
              : null,

          payments:
            normalizedPayments.map(
              (payment) => ({

                paymentId:
                  payment.paymentId,

                syncId:
                  payment.syncId,

                transactionId:
                  payment.transactionId,

                loanId:
                  payment.loanId,

                amount:
                  payment.amount,

                paymentDate:
                  payment.paymentDate ||

                  payment.createdAt ||

                  null,

                status:
                  payment.status

              })
            )

        }
      );


      // ====================================
      // RESPONSE
      // ====================================

      return res
        .status(200)
        .json({

          success:
            true,

          count:
            normalizedPayments.length,

          dateRange: {

            oldest:
              oldestDate
                ? oldestDate.toISOString()
                : null,

            newest:
              newestDate
                ? newestDate.toISOString()
                : null

          },

          payments:
            normalizedPayments

        });


    } catch (error) {

      console.error(
        "❌ GET ALL PAYMENT HISTORY ERROR:",
        error
      );


      return res
        .status(500)
        .json({

          success:
            false,

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


      // ====================================
      // NORMALIZE PAYMENT HISTORY
      // ====================================
      //
      // Hii haibadilishi malipo ya zamani.
      //
      // Inaacha fields zote zilizokuwepo,
      // na kuhakikisha syncId inarudi
      // kwa frontend.
      //
      // App za zamani zinaendelea kupata
      // response ileile.
      // ====================================

      const normalizedPayments =
        payments.map(
          (payment) => ({

            ...payment,

            syncId:
              payment.syncId || null

          })
        );


      console.log(
        "📥 PAYMENT HISTORY RESPONSE:",
        {
          loanId,

          count:
            normalizedPayments.length,

          payments:
            normalizedPayments.map(
              (payment) => ({
                paymentId:
                  String(
                    payment._id
                  ),

                syncId:
                  payment.syncId,

                amount:
                  payment.amount
              })
            )
        }
      );


      return res.status(200).json(
        normalizedPayments
      );

    } catch (error) {

      console.error(
        "❌ GET PAYMENT HISTORY ERROR:",
        error
      );

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
  
  // ====================================
// DELETE LOAN COMPLETELY
// ====================================

const deleteDebtLoan =
  async (req, res) => {

    let session = null;

    try {

      const loanId =
        req.params.id;


      // ====================================
      // VALIDATE LOAN ID
      // ====================================

      if (
        !loanId ||
        !mongoose.Types.ObjectId.isValid(
          loanId
        )
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Loan ID si sahihi"
        });

      }


      // ====================================
      // START SESSION
      // ====================================

      session =
        await mongoose.startSession();

      session.startTransaction();


      // ====================================
      // FIND LOAN
      // ====================================

      const loan =
        await DebtLoan.findOne({
          _id: loanId,
          owner: req.ownerId,
          branch: req.branchId
        })
          .session(session);


      // ====================================
      // LOAN NOT FOUND
      // ====================================

      if (!loan) {

        await session.abortTransaction();

        return res.status(404).json({
          success: false,
          message:
            "Deni halijapatikana"
        });

      }


      // ====================================
      // PAID LOAN CANNOT DELETE
      // ====================================

      if (
        loan.status === "paid"
      ) {

        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message:
            "Deni lililolipwa kikamilifu haliwezi kufutwa"
        });

      }


      // ====================================
      // SAVE VALUES BEFORE DELETE
      // ====================================

      const customerId =
        loan.customer;

      const deletedLoanId =
        loan._id;

      const deletedLoanSyncId =
        loan.syncId;


      console.log(
        "🗑️ DELETING LOAN:",
        {
          loanId:
            String(deletedLoanId),

          syncId:
            deletedLoanSyncId,

          owner:
            String(req.ownerId),

          branch:
            String(req.branchId)
        }
      );


      // ====================================
      // DELETE PAYMENT HISTORY
      // ====================================

      await DebtPayment.deleteMany(
        {
          loan: deletedLoanId,
          owner: req.ownerId,
          branch: req.branchId
        },
        {
          session
        }
      );


      // ====================================
      // UPDATE CUSTOMER ACTIVE LOANS
      // ====================================

      if (customerId) {

        const customer =
          await CustomerIdentity.findById(
            customerId
          )
            .session(session);


        if (customer) {

          customer.activeLoans =
            Math.max(
              0,
              Number(
                customer.activeLoans || 0
              ) - 1
            );

          await customer.save({
            session
          });

        }

      }


      // ====================================
      // DELETE LOAN COMPLETELY
      // ====================================

      const deletedLoan =
        await DebtLoan.findOneAndDelete(
          {
            _id: deletedLoanId,
            owner: req.ownerId,
            branch: req.branchId
          },
          {
            session
          }
        );


      // ====================================
      // VERIFY DELETE
      // ====================================

      if (!deletedLoan) {

        throw new Error(
          "Deni halikuweza kufutwa"
        );

      }


      // ====================================
      // COMMIT TRANSACTION
      // ====================================

      await session.commitTransaction();


      console.log(
        "✅ LOAN DELETED COMPLETELY:",
        String(deletedLoanId)
      );


      // ====================================
      // SUCCESS
      // ====================================

      return res.status(200).json({

        success: true,

        message:
          "Deni limefutwa kikamilifu",

        loan: {

          _id:
            deletedLoanId,

          syncId:
            deletedLoanSyncId,

          status:
            "deleted"

        }

      });


    } catch (error) {

      // ====================================
      // ROLLBACK
      // ====================================

      if (
        session &&
        session.inTransaction()
      ) {

        await session.abortTransaction();

      }


      console.error(
        "❌ DELETE LOAN ERROR:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Imeshindikana kufuta deni"

      });


    } finally {

      // ====================================
      // CLOSE SESSION
      // ====================================

      if (session) {

        await session.endSession();

      }

    }

  };
 // ====================================
// SYNC OFFLINE DELETE LOAN
// ====================================

const syncDeleteLoan =
  async (req, res) => {

    let session = null;

    try {

      const {
        loanId,
        loanSyncId,
        deleteSyncId,
        deviceId
      } = req.body;


      // ====================================
      // VALIDATION
      // ====================================

      if (
        !loanId &&
        !loanSyncId
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Loan ID or loanSyncId required"
        });

      }


      if (!deleteSyncId) {

        return res.status(400).json({
          success: false,
          message:
            "deleteSyncId required"
        });

      }


      if (!deviceId) {

        return res.status(400).json({
          success: false,
          message:
            "deviceId required"
        });

      }


      // ====================================
      // FIND LOAN
      // ====================================

      let loan = null;


      // ------------------------------------
      // FIND BY SERVER MONGODB ID
      // ------------------------------------

      if (
        loanId &&
        mongoose.Types.ObjectId.isValid(
          loanId
        )
      ) {

        loan =
          await DebtLoan.findOne({
            _id: loanId,
            owner: req.ownerId,
            branch: req.branchId
          });

      }


      // ------------------------------------
      // FIND BY OFFLINE syncId
      // ------------------------------------

      if (
        !loan &&
        loanSyncId
      ) {

        loan =
          await DebtLoan.findOne({
            owner: req.ownerId,
            branch: req.branchId,
            syncId: loanSyncId
          });

      }


      // ====================================
      // LOAN ALREADY DOES NOT EXIST
      // ====================================

      if (!loan) {

        return res.status(200).json({
          success: true,
          alreadySynced: true,
          message:
            "Deni tayari limefutwa kwenye server"
        });

      }


      // ====================================
      // PAID LOAN CANNOT DELETE
      // ====================================

      if (
        loan.status === "paid"
      ) {

        return res.status(400).json({
          success: false,
          message:
            "Deni lililolipwa kikamilifu haliwezi kufutwa"
        });

      }


      // ====================================
      // START TRANSACTION
      // ====================================

      session =
        await mongoose.startSession();

      session.startTransaction();


      // ====================================
      // SAVE IMPORTANT VALUES BEFORE DELETE
      // ====================================

      const deletedLoanId =
        loan._id;

      const deletedLoanSyncId =
        loan.syncId;

      const customerId =
        loan.customer;


      // ====================================
      // DELETE PAYMENTS RELATED TO LOAN
      // ====================================

      await DebtPayment.deleteMany(
        {
          owner: req.ownerId,
          branch: req.branchId,
          loan: deletedLoanId
        },
        {
          session
        }
      );


      // ====================================
      // UPDATE CUSTOMER ACTIVE LOANS
      // ====================================

      if (customerId) {

        await CustomerIdentity.findByIdAndUpdate(
          customerId,
          {
            $inc: {
              activeLoans: -1
            }
          },
          {
            session
          }
        );

      }


      // ====================================
      // DELETE LOAN COMPLETELY
      // ====================================

      await DebtLoan.deleteOne(
        {
          _id: deletedLoanId,
          owner: req.ownerId,
          branch: req.branchId
        },
        {
          session
        }
      );


      // ====================================
      // COMMIT TRANSACTION
      // ====================================

      await session.commitTransaction();


      return res.status(200).json({

        success: true,

        alreadySynced: false,

        message:
          "Deni limefutwa kabisa kwenye server",

        loan: {

          _id:
            deletedLoanId,

          syncId:
            deletedLoanSyncId,

          deleteSyncId:
            deleteSyncId,

          status:
            "deleted"

        }

      });


    } catch (error) {

      if (
        session &&
        session.inTransaction()
      ) {

        await session.abortTransaction();

      }


      console.error(
        "❌ SYNC DELETE LOAN ERROR:",
        error
      );


      return res.status(500).json({

        success: false,

        message:
          error?.message ||
          "Delete loan sync failed"

      });


    } finally {

      if (session) {

        await session.endSession();

      }

    }

  };

 module.exports = {
  findOrCreateCustomer,
  checkCredit,
  deleteDebtLoan,
  syncDeleteLoan,
  createDebtLoan,
  syncLoan,
  syncPayment,
  getAllPaymentHistory,
   syncRefund,
  getLoanHistory,
  getLoanById,
  receivePayment,
  scanFingerprint,
  getPaymentHistory,
  scanDebtsFromImage,
  getAllLoansForRecovery,
  applyLoanRecovery,
  importDebts,
  refundPayment,
  getOverdueLoans
};
