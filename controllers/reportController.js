       const mongoose = require("mongoose");
  const Sale =
require("../models/Sale");

const Order =
require("../models/Order");

const CashEntry =
require("../models/CashEntry");

const DebtLoan =
require("../models/DebtLoan");

const DebtPayment =
require("../models/DebtPayment");


const Product =
require("../models/Product");

const ReportHistory =
require("../models/ReportHistory");

 const saveReportHistory = async (
  req,
  reportType,
  report,
  periodStart = null,
  periodEnd = null
) => {
  try {

    if (
      !req.ownerId ||
      !req.branchId
    ) {
      return null;
    }

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );

    const history =
      await ReportHistory.findOneAndUpdate(

        {
          owner: ownerId,
          branch: branchId,
          reportType,
          periodStart,
          periodEnd
        },

        {
          $set: {
            owner: ownerId,
            branch: branchId,
            reportType,
            periodStart,
            periodEnd,
            report
          }
        },

        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true
        }

      );

    return history;

  } catch (err) {

    console.error(
      "SAVE REPORT HISTORY:",
      err
    );

    // History failure is not allowed
    // to break the actual report API.
    return null;
  }
};
 
// ============================================
// REPORT DATE KEY
// ============================================

const getDateKey =
  (date = new Date()) => {

    const year =
      date.getUTCFullYear();

    const month =
      String(
        date.getUTCMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        date.getUTCDate()
      ).padStart(
        2,
        "0"
      );

    return `${year}-${month}-${day}`;

  };
 
// ============================================
// BUILD CREDIT HISTORY REPORT
//
// FORMAT COMPATIBLE WITH MOBILE APP
//
// RULE:
// DebtLoan    → createdAt
// DebtPayment → paymentDate
//
// TODAY / HISTORICAL:
// - Loans issued on selected date
// - Payments collected on selected date
// - Refunds on selected date
// - Current loan health
// - Current outstanding
// ============================================

const buildCreditHistoryReport =
  async (
    ownerId,
    branchId,
    date
  ) => {

    try {

      // ========================================
      // DATE RANGE
      // ========================================

      const start =
        new Date(
          `${date}T00:00:00.000Z`
        );

      const end =
        new Date(start);

      end.setUTCDate(
        end.getUTCDate() + 1
      );


      // ========================================
      // LOANS CREATED ON THIS DATE
      //
      // MUHIMU:
      // DebtLoan haina paymentDate
      // kwa loan issuance.
      //
      // Tunatumia createdAt.
      // ========================================

      const loansAgg =
        await DebtLoan.aggregate([
          {
            $match: {

              owner:
                ownerId,

              branch:
                branchId,

              createdAt: {
                $gte: start,
                $lt: end
              }

            }
          },

          {
            $group: {

              _id: null,

              totalLoans: {
                $sum: 1
              },

              totalLoanAmount: {
                $sum: {
                  $ifNull: [
                    "$principalAmount",
                    0
                  ]
                }
              }

            }
          }
        ]);


      // ========================================
      // PAYMENTS ON THIS DATE
      //
      // MUHIMU:
      // Tunatumia paymentDate.
      //
      // PAYMENT HALISI:
      // type   = payment
      // status = posted
      // ========================================

      const paymentsAgg =
        await DebtPayment.aggregate([
          {
            $match: {

              owner:
                ownerId,

              branch:
                branchId,

              paymentDate: {
                $gte: start,
                $lt: end
              },

              type:
                "payment",

              status:
                "posted"

            }
          },

          {
            $group: {

              _id: null,

              totalPayments: {
                $sum: 1
              },

              totalPaid: {
                $sum: {
                  $abs: {
                    $ifNull: [
                      "$amount",
                      0
                    ]
                  }
                }
              }

            }
          }
        ]);


      // ========================================
      // REFUNDS ON THIS DATE
      //
      // type   = refund
      // status = reversed
      // ========================================

      const refundsAgg =
        await DebtPayment.aggregate([
          {
            $match: {

              owner:
                ownerId,

              branch:
                branchId,

              paymentDate: {
                $gte: start,
                $lt: end
              },

              type:
                "refund",

              status:
                "reversed"

            }
          },

          {
            $group: {

              _id: null,

              totalRefunds: {
                $sum: 1
              },

              totalRefundAmount: {
                $sum: {
                  $abs: {
                    $ifNull: [
                      "$amount",
                      0
                    ]
                  }
                }
              }

            }
          }
        ]);


      // ========================================
      // CURRENT ACTIVE LOANS
      //
      // Hii ni hali ya sasa.
      // ========================================

      const activeLoans =
        await DebtLoan.countDocuments({

          owner:
            ownerId,

          branch:
            branchId,

          status:
            "active"

        });


      // ========================================
      // CURRENT PAID LOANS
      // ========================================

      const paidLoans =
        await DebtLoan.countDocuments({

          owner:
            ownerId,

          branch:
            branchId,

          status:
            "paid"

        });


      // ========================================
      // CURRENT OVERDUE LOANS
      // ========================================

      const overdueLoans =
        await DebtLoan.countDocuments({

          owner:
            ownerId,

          branch:
            branchId,

          status:
            "overdue"

        });


      // ========================================
      // CURRENT OUTSTANDING
      //
      // Loans ambazo bado zinadaiwa.
      // ========================================

      const outstandingAgg =
        await DebtLoan.aggregate([
          {
            $match: {

              owner:
                ownerId,

              branch:
                branchId,

              status: {
                $in: [
                  "active",
                  "overdue"
                ]
              }

            }
          },

          {
            $group: {

              _id: null,

              totalOutstandingCapital: {
                $sum: {
                  $ifNull: [
                    "$balanceAmount",
                    0
                  ]
                }
              }

            }
          }
        ]);


      // ========================================
      // CURRENT OVERDUE AMOUNT
      // ========================================

      const overdueAgg =
        await DebtLoan.aggregate([
          {
            $match: {

              owner:
                ownerId,

              branch:
                branchId,

              status:
                "overdue"

            }
          },

          {
            $group: {

              _id: null,

              overdueAmount: {
                $sum: {
                  $ifNull: [
                    "$balanceAmount",
                    0
                  ]
                }
              }

            }
          }
        ]);


      // ========================================
      // CUSTOMERS
      //
      // Unique customers wenye loans
      // kwenye branch hii.
      // ========================================

      const customersAgg =
        await DebtLoan.aggregate([
          {
            $match: {

              owner:
                ownerId,

              branch:
                branchId

            }
          },

          {
            $group: {
              _id:
                "$customer"
            }
          },

          {
            $count:
              "total"
          }
        ]);


      // ========================================
      // VALUES
      // ========================================

      const totalLoans =
        Number(
          loansAgg[0]?.totalLoans || 0
        );


      const totalLoanAmount =
        Number(
          loansAgg[0]?.totalLoanAmount || 0
        );


      const totalPayments =
        Number(
          paymentsAgg[0]?.totalPayments || 0
        );


      const totalPaid =
        Number(
          paymentsAgg[0]?.totalPaid || 0
        );


      const totalRefunds =
        Number(
          refundsAgg[0]?.totalRefunds || 0
        );


      const totalRefundAmount =
        Number(
          refundsAgg[0]?.totalRefundAmount || 0
        );


      const totalOutstandingCapital =
        Number(
          outstandingAgg[0]
            ?.totalOutstandingCapital || 0
        );


      const overdueAmount =
        Number(
          overdueAgg[0]
            ?.overdueAmount || 0
        );


      const customers =
        Number(
          customersAgg[0]?.total || 0
        );


      // ========================================
      // NET COLLECTION
      //
      // PAYMENT - REFUND
      // ========================================

      const netCollection =
        totalPaid -
        totalRefundAmount;


      // ========================================
      // FINAL REPORT
      // ========================================

      return {

        // ======================================
        // DATE
        // ======================================

        date,


        // ======================================
        // SUMMARY
        // ======================================

        summary: {

          totalLoans,

          totalPaid,

          totalLoanAmount,

          totalPayments,

          totalRefundAmount,

          netCollection,

          totalOutstandingCapital,

          totalBalance:
            totalOutstandingCapital,

          customers,

          activeLoans,

          paidLoans,

          overdueLoans,

          overdueAmount

        },


        // ======================================
        // CREDIT
        // ======================================

        credit: {

          loansIssued:
            totalLoans,

          amountIssued:
            totalLoanAmount,

          paymentsCollected:
            totalPaid,

          paymentsCount:
            totalPayments,

          refunds:
            totalRefundAmount,

          refundsCount:
            totalRefunds,

          netCollection,

          outstandingBalance:
            totalOutstandingCapital,

          totalOutstandingCapital,

          activeLoans,

          paidLoans,

          overdueLoans,

          overdueAmount,

          customers

        }

      };

    } catch (error) {

      // ========================================
      // ERROR
      // ========================================

      console.error(
        "❌ BUILD CREDIT HISTORY REPORT ERROR:",
        error
      );

      throw error;

    }

  };
 


  const getInventoryReport = async (req, res) => {
  try {
    // SECURITY
    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );

    // SUMMARY
    const summaryAgg =
      await Product.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId
          }
        },
        {
          $group: {
            _id: null,
            totalProducts: {
              $sum: 1
            },
            stockQty: {
              $sum: "$stockQty"
            },
            stockCostValue: {
              $sum: {
                $multiply: [
                  "$stockQty",
                  "$buyPrice"
                ]
              }
            },
            stockSaleValue: {
              $sum: {
                $multiply: [
                  "$stockQty",
                  "$sellPrice"
                ]
              }
            }
          }
        }
      ]);

    const summary =
      summaryAgg[0] || {
        totalProducts: 0,
        stockQty: 0,
        stockCostValue: 0,
        stockSaleValue: 0
      };

    const expectedProfit =
      summary.stockSaleValue -
      summary.stockCostValue;

    // LOW STOCK
    const lowStock =
      await Product.find({
        owner: ownerId,
        branch: branchId,
        isActive: true,
        stockQty: { $gt: 0 },
        $expr: {
          $lte: [
            "$stockQty",
            "$lowStockAlert"
          ]
        }
      })
        .select(
          "name stockQty lowStockAlert"
        )
        .lean();

    // OUT OF STOCK
    const outOfStock =
      await Product.find({
        owner: ownerId,
        branch: branchId,
        isActive: true,
        stockQty: { $lte: 0 }
      })
        .select("name stockQty")
        .lean();

    // TOP VALUE
    const topValue =
      await Product.find({
        owner: ownerId,
        branch: branchId,
        isActive: true
      })
        .select(
          "name stockQty sellPrice"
        )
        .sort({
          stockQty: -1,
          sellPrice: -1
        })
        .limit(10)
        .lean();

   const report = {
  summary: {
    totalProducts:
      summary.totalProducts,
    stockQty:
      summary.stockQty,
    stockCostValue:
      summary.stockCostValue,
    stockSaleValue:
      summary.stockSaleValue,
    expectedProfit
  },

  alerts: {
    lowStockCount:
      lowStock.length,
    outOfStockCount:
      outOfStock.length
  },

  lowStock,
  outOfStock,
  topValue
};

await saveReportHistory(
  req,
  "inventory",
  report
);

return res.status(200).json(report);

  } catch (error) {
    console.log(
      "INVENTORY ERROR:",
      error
    );

    res.status(500).json({
      message:
        error.message
    });
  }
};
 const getDailyReport = async (req, res) => {
  try {
    // ============================================================
    // SECURITY
    // ============================================================

    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    // ============================================================
    // UTC DATE RANGE
    // ============================================================

    const today = new Date();

    today.setUTCHours(
      0,
      0,
      0,
      0
    );

    const tomorrow = new Date(today);

    tomorrow.setUTCDate(
      today.getUTCDate() + 1
    );

    // ============================================================
    // IDS
    // ============================================================

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );

    // ============================================================
    // COMMON DATE FILTER
    //
    // Inatumika kwa:
    // Sale
    // Order
    // CashEntry
    // DebtLoan
    //
    // Hizi zinatumia createdAt.
    // ============================================================

    const todayFilter = {
      owner: ownerId,
      branch: branchId,

      createdAt: {
        $gte: today,
        $lt: tomorrow,
      },
    };

    // ============================================================
    // DEBT PAYMENT DATE FILTER
    //
    // MUHIMU:
    // DebtPayment ina paymentDate.
    //
    // HATUTUMII createdAt hapa.
    //
    // MUHIMU ZAIDI:
    // HATUWEKI status HAPA.
    //
    // Kwa sababu:
    //
    // PAYMENT:
    // type   = payment
    // status = posted
    //
    // REFUND:
    // type   = refund
    // status = reversed
    //
    // Kwa hiyo kila moja itakuwa na filter yake.
    // ============================================================

    const debtPaymentTodayFilter = {
      owner: ownerId,
      branch: branchId,

      paymentDate: {
        $gte: today,
        $lt: tomorrow,
      },
    };

    // ============================================================
    // SALES — TODAY ONLY
    // ============================================================

    const salesAgg =
      await Sale.aggregate([
        {
          $match: {
            ...todayFilter,
          },
        },

        {
          $group: {
            _id: null,

            totalSales: {
              $sum: {
                $ifNull: [
                  "$totalAmount",
                  0,
                ],
              },
            },

            totalSalesProfit: {
              $sum: {
                $ifNull: [
                  "$totalProfit",
                  0,
                ],
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const totalSales =
      Number(
        salesAgg[0]?.totalSales || 0
      );

    const totalSalesProfit =
      Number(
        salesAgg[0]?.totalSalesProfit || 0
      );

    const salesCount =
      Number(
        salesAgg[0]?.count || 0
      );

    // ============================================================
    // PURCHASES / ORDERS — TODAY ONLY
    // ============================================================

    const ordersAgg =
      await Order.aggregate([
        {
          $match: {
            ...todayFilter,
          },
        },

        {
          $group: {
            _id: null,

            totalBuy: {
              $sum: {
                $ifNull: [
                  "$buyTotal",
                  0,
                ],
              },
            },

            totalSellValue: {
              $sum: {
                $ifNull: [
                  "$sellTotal",
                  0,
                ],
              },
            },

            totalOrderProfit: {
              $sum: {
                $ifNull: [
                  "$totalProfit",
                  0,
                ],
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const totalBuy =
      Number(
        ordersAgg[0]?.totalBuy || 0
      );

    const totalSellValue =
      Number(
        ordersAgg[0]?.totalSellValue || 0
      );

    const totalOrderProfit =
      Number(
        ordersAgg[0]?.totalOrderProfit || 0
      );

    const orderCount =
      Number(
        ordersAgg[0]?.count || 0
      );

    // ============================================================
    // CASH — TODAY ONLY
    // ============================================================

    const cashAgg =
      await CashEntry.aggregate([
        {
          $match: {
            ...todayFilter,

            status: "active",
          },
        },

        {
          $group: {
            _id: "$type",

            total: {
              $sum: {
                $ifNull: [
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    let cashIncome = 0;
    let totalExpense = 0;

    cashAgg.forEach((item) => {
      const amount =
        Number(
          item?.total || 0
        );

      if (
        item?._id === "income"
      ) {
        cashIncome += amount;
      }

      if (
        item?._id === "expense"
      ) {
        totalExpense += amount;
      }
    });

    // ============================================================
    // LOANS ISSUED — TODAY ONLY
    // ============================================================

    const loanIssuedAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            ...todayFilter,
          },
        },

        {
          $group: {
            _id: null,

            totalIssued: {
              $sum: {
                $ifNull: [
                  "$principalAmount",
                  0,
                ],
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const loansIssued =
      Number(
        loanIssuedAgg[0]?.totalIssued || 0
      );

    const loansIssuedCount =
      Number(
        loanIssuedAgg[0]?.count || 0
      );

    // ============================================================
    // PAYMENTS — TODAY ONLY
    //
    // DebtPayment:
    //
    // paymentDate = leo
    // type = payment
    // status = posted
    //
    // HAPA TUNATAKA PAYMENT HALISI TU.
    // ============================================================

    const paymentAgg =
      await DebtPayment.aggregate([
        {
          $match: {
            ...debtPaymentTodayFilter,

            type: "payment",

            status: "posted",
          },
        },

        {
          $group: {
            _id: null,

            totalCollected: {
              $sum: {
                $abs: {
                  $ifNull: [
                    "$amount",
                    0,
                  ],
                },
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const debtCollected =
      Number(
        paymentAgg[0]?.totalCollected || 0
      );

    const paymentsCount =
      Number(
        paymentAgg[0]?.count || 0
      );

    // ============================================================
    // REFUNDS — TODAY ONLY
    //
    // MUHIMU:
    //
    // Refund yako inahifadhiwa hivi:
    //
    // type:
    // "refund"
    //
    // status:
    // "reversed"
    //
    // amount:
    // -refundAmount
    //
    // Kwa hiyo HATUTAFUTI status = posted.
    // Tunatafuta status = reversed.
    // ============================================================

    const refundAgg =
      await DebtPayment.aggregate([
        {
          $match: {
            ...debtPaymentTodayFilter,

            type: "refund",

            status: "reversed",
          },
        },

        {
          $group: {
            _id: null,

            totalRefunds: {
              $sum: {
                $abs: {
                  $ifNull: [
                    "$amount",
                    0,
                  ],
                },
              },
            },

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const refunds =
      Number(
        refundAgg[0]?.totalRefunds || 0
      );

    const refundsCount =
      Number(
        refundAgg[0]?.count || 0
      );

    // ============================================================
    // DAILY NET COLLECTION
    //
    // Payment - Refund
    // ============================================================

    const totalPaid =
      debtCollected;

    const totalPayments =
      paymentsCount;

    const netCollection =
      totalPaid -
      refunds;

    // ============================================================
    // DAILY LOAN STATUS
    //
    // Loans zilizotolewa leo tu.
    // ============================================================

    const dailyLoanStatusAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            ...todayFilter,
          },
        },

        {
          $group: {
            _id: null,

            totalLoans: {
              $sum: 1,
            },

            totalPrincipal: {
              $sum: {
                $ifNull: [
                  "$principalAmount",
                  0,
                ],
              },
            },

            activeLoans: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "active",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            paidLoans: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "paid",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            overdueLoans: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "overdue",
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            overdueAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$status",
                      "overdue",
                    ],
                  },

                  {
                    $ifNull: [
                      "$remainingAmount",
                      "$principalAmount",
                    ],
                  },

                  0,
                ],
              },
            },
          },
        },
      ]);

    const totalLoans =
      Number(
        dailyLoanStatusAgg[0]?.totalLoans || 0
      );

    const dailyLoanPrincipal =
      Number(
        dailyLoanStatusAgg[0]?.totalPrincipal || 0
      );

    const activeLoans =
      Number(
        dailyLoanStatusAgg[0]?.activeLoans || 0
      );

    const paidLoans =
      Number(
        dailyLoanStatusAgg[0]?.paidLoans || 0
      );

    const overdueLoans =
      Number(
        dailyLoanStatusAgg[0]?.overdueLoans || 0
      );

    const overdueAmount =
      Number(
        dailyLoanStatusAgg[0]?.overdueAmount || 0
      );

    // ============================================================
    // ALL OUTSTANDING LOANS
    //
    // GLOBAL — LOANS ZOTE ZINAZODAIWA SASA.
    // ============================================================

    const outstandingAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,

            status: {
              $in: [
                "active",
                "overdue",
              ],
            },
          },
        },

        {
          $group: {
            _id: null,

            totalPrincipal: {
              $sum: {
                $ifNull: [
                  "$principalAmount",
                  0,
                ],
              },
            },

            totalPaid: {
              $sum: {
                $ifNull: [
                  "$paidAmount",
                  0,
                ],
              },
            },
          },
        },
      ]);

    const allOutstandingPrincipal =
      Number(
        outstandingAgg[0]?.totalPrincipal || 0
      );

    const allOutstandingPaid =
      Number(
        outstandingAgg[0]?.totalPaid || 0
      );

    const outstandingCapital =
      Math.max(
        allOutstandingPrincipal -
          allOutstandingPaid,
        0
      );

    // ============================================================
    // CUSTOMERS — TODAY ONLY
    // ============================================================

    const customersAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            ...todayFilter,
          },
        },

        {
          $group: {
            _id: "$customer",
          },
        },

        {
          $count: "count",
        },
      ]);

    const customers =
      Number(
        customersAgg[0]?.count || 0
      );

    // ============================================================
    // NET CASH FLOW — TODAY ONLY
    //
    // Payment inaongeza cash
    // Refund inapunguza cash
    // ============================================================

    const netCashFlow =
      totalSales +
      cashIncome +
      debtCollected -
      refunds -
      totalExpense -
      totalBuy;

    // ============================================================
    // BUSINESS PROFIT — TODAY ONLY
    // ============================================================

    const totalBusinessProfit =
      totalSalesProfit +
      totalOrderProfit;

    const netProfit =
      totalBusinessProfit -
      totalExpense;

    const profitMargin =
      totalBusinessProfit > 0
        ? (
            netProfit /
            totalBusinessProfit
          ) *
          100
        : 0;

    const profitStatus =
      netProfit >= 0
        ? "BIASHARA INA FAIDA"
        : "BIASHARA INA HASARA";

    // ============================================================
    // PURCHASE PROFIT
    // ============================================================

    const remainingPurchaseProfit =
      totalOrderProfit;

    // ============================================================
    // COLLECTION RATE
    //
    // Hii inatumia payment halisi.
    // Refund haiongezi collection rate.
    // ============================================================

    const collectionRate =
      loansIssued > 0
        ? (
            debtCollected /
            loansIssued
          ) *
          100
        : 0;

    // ============================================================
    // RESPONSE
    // ============================================================

    const report = {
      // ========================================================
      // DATE
      // ========================================================

      date: today,

      // ========================================================
      // SALES — TODAY
      // ========================================================

      sales: {
        totalSales,

        totalSalesProfit,

        count:
          salesCount,
      },

      // ========================================================
      // PURCHASES — TODAY
      // ========================================================

      purchases: {
        totalBuy,

        totalSellValue,

        totalOrderProfit,

        remainingPurchaseProfit,

        count:
          orderCount,
      },

      // ========================================================
      // CASH — TODAY
      // ========================================================

      cash: {
        cashIncome,

        totalExpense,
      },

      // ========================================================
      // CREDIT
      // ========================================================

      credit: {
        // ------------------------------------------------------
        // LOANS ISSUED TODAY
        // ------------------------------------------------------

        loansIssued,

        loansCount:
          loansIssuedCount,

        // ------------------------------------------------------
        // PAYMENTS TODAY
        // ------------------------------------------------------

        debtCollected,

        paymentsCollected:
          debtCollected,

        paymentsCount,

        // ------------------------------------------------------
        // LOAN COUNTS TODAY
        // ------------------------------------------------------

        totalLoans,

        loanCount:
          totalLoans,

        activeLoans,

        paidLoans,

        overdueCount:
          overdueLoans,

        overdueLoans,

        // ------------------------------------------------------
        // OVERDUE AMOUNT TODAY
        // ------------------------------------------------------

        overdueAmount,

        // ------------------------------------------------------
        // GLOBAL OUTSTANDING
        // ------------------------------------------------------

        outstandingBalance:
          outstandingCapital,

        outstandingCapital,

        totalOutstandingCapital:
          outstandingCapital,

        // ------------------------------------------------------
        // TODAY'S LOAN AMOUNT
        // ------------------------------------------------------

        totalLoanAmount:
          dailyLoanPrincipal,

        amountIssued:
          loansIssued,

        // ------------------------------------------------------
        // REFUNDS TODAY
        // ------------------------------------------------------

        refunds,

        refundsCount,

        // ------------------------------------------------------
        // NET COLLECTION
        // ------------------------------------------------------

        netCollection,
      },

      // ========================================================
      // SUMMARY
      // ========================================================

      summary: {
        // ------------------------------------------------------
        // TODAY LOANS
        // ------------------------------------------------------

        totalLoans,

        loanCount:
          totalLoans,

        loansCount:
          totalLoans,

        totalLoanAmount:
          loansIssued,

        amountIssued:
          loansIssued,

        // ------------------------------------------------------
        // TODAY PAYMENTS
        // ------------------------------------------------------

        totalPaid,

        totalPayments,

        totalPaymentsCollected:
          totalPaid,

        paymentsCount,

        // ------------------------------------------------------
        // TODAY CUSTOMERS
        // ------------------------------------------------------

        customers,

        // ------------------------------------------------------
        // TODAY LOAN STATUS
        // ------------------------------------------------------

        activeLoans,

        paidLoans,

        overdueLoans:
          overdueLoans,

        overdueCount:
          overdueLoans,

        overdueAmount,

        // ------------------------------------------------------
        // GLOBAL OUTSTANDING
        // ------------------------------------------------------

        totalOutstandingCapital:
          outstandingCapital,

        totalBalance:
          outstandingCapital,

        outstandingBalance:
          outstandingCapital,

        // ------------------------------------------------------
        // TODAY COLLECTION
        // ------------------------------------------------------

        refunds,

        refundsCount,

        netCollection,

        collectionRate,

        // ------------------------------------------------------
        // BUSINESS
        // ------------------------------------------------------

        netCashFlow,

        totalBusinessProfit,

        netProfit,

        profitMargin,

        profitStatus,
      },
    };

    // ============================================================
    // LOG
    // ============================================================

    console.log(
      "📊 DAILY REPORT:",
      {
        ownerId:
          req.ownerId,

        branchId:
          req.branchId,

        date:
          today.toISOString(),

        // LOANS
        loansIssued,

        loansIssuedCount,

        totalLoans,

        totalLoanAmount:
          loansIssued,

        // PAYMENTS
        payments:
          debtCollected,

        paymentsCount,

        // REFUNDS
        refunds,

        refundsCount,

        // NET
        netCollection,

        // OUTSTANDING
        outstandingCapital,

        // OVERDUE
        overdueLoans,

        overdueAmount,

        // CUSTOMERS
        customers,
      }
    );

    // ============================================================
    // DEBUG — DEBT PAYMENTS
    //
    // Hii itakusaidia kuona kama database ina
    // payment/refund ya leo.
    // ============================================================

    console.log(
      "💰 DEBT PAYMENT REPORT FILTER:",
      {
        owner: ownerId.toString(),
        branch: branchId.toString(),

        from:
          today.toISOString(),

        to:
          tomorrow.toISOString(),

        paymentAmount:
          debtCollected,

        paymentCount:
          paymentsCount,

        refundAmount:
          refunds,

        refundCount:
          refundsCount,
      }
    );

    // ============================================================
    // DEBUG — REFUND QUERY
    //
    // Hii itathibitisha moja kwa moja kama refund
    // imeingia kwenye report.
    // ============================================================

    console.log(
      "🔄 REFUND REPORT FILTER:",
      {
        owner:
          ownerId.toString(),

        branch:
          branchId.toString(),

        paymentDateFrom:
          today.toISOString(),

        paymentDateTo:
          tomorrow.toISOString(),

        type:
          "refund",

        status:
          "reversed",

        refundAmount:
          refunds,

        refundCount:
          refundsCount,
      }
    );

    // ============================================================
    // RESPONSE
    // ============================================================

    return res.status(200).json(
      report
    );

  } catch (error) {
    console.error(
      "❌ DAILY REPORT ERROR:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to generate daily report",
    });
  }
};
  
const getMonthlyReport = async (req, res) => {
  try {
    // SECURITY
    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const now = new Date();

    // USE UTC
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1
      )
    );

    const end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1
      )
    );

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );

    // SALES
    const salesAgg =
      await Sale.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: {
              $sum: "$totalAmount"
            },
            totalProfit: {
              $sum: "$totalProfit"
            },
            count: {
              $sum: 1
            }
          }
        }
      ]);

    const totalSales =
      salesAgg[0]?.totalSales || 0;

    const totalProfit =
      salesAgg[0]?.totalProfit || 0;

    const salesCount =
      salesAgg[0]?.count || 0;

    // PURCHASES
    const ordersAgg =
      await Order.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalBuy: {
              $sum: "$buyTotal"
            },
            totalSellValue: {
              $sum: "$sellTotal"
            },
            totalOrderProfit: {
              $sum: "$totalProfit"
            },
            count: {
              $sum: 1
            }
          }
        }
      ]);

    const totalBuy =
      ordersAgg[0]?.totalBuy || 0;

    const totalSellValue =
      ordersAgg[0]
        ?.totalSellValue || 0;

    const totalOrderProfit =
      ordersAgg[0]
        ?.totalOrderProfit || 0;

    const orderCount =
      ordersAgg[0]?.count || 0;

    // CASH
    const cashAgg =
      await CashEntry.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            status: "active",
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: "$type",
            total: {
              $sum: "$amount"
            }
          }
        }
      ]);

    let income = 0;
    let totalExpense = 0;

    cashAgg.forEach((c) => {
      if (c._id === "income") {
        income = c.total;
      }

      if (c._id === "expense") {
        totalExpense = c.total;
      }
    });

    // LOANS
    const loanAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalIssued: {
              $sum:
                "$principalAmount"
            }
          }
        }
      ]);

    const loansIssued =
      loanAgg[0]?.totalIssued || 0;

    // PAYMENTS
    const paymentAgg =
      await DebtPayment.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalCollected: {
              $sum: "$amount"
            }
          }
        }
      ]);

    const collected =
      paymentAgg[0]
        ?.totalCollected || 0;

    // OVERDUE
    const overdueCount =
      await DebtLoan.countDocuments({
        owner: ownerId,
        branch: branchId,
        status: "overdue"
      });

    // CALCULATIONS
    const netPosition =
      totalSales +
      income +
      collected -
      totalExpense -
      totalBuy;

const remainingPurchaseProfit =
  totalOrderProfit -
  totalExpense;

    const totalBusinessProfit =
      totalProfit +
      totalOrderProfit;

    const netProfit =
      totalBusinessProfit -
      totalExpense;

    const profitMargin =
      totalBusinessProfit > 0
        ? (netProfit /
            totalBusinessProfit) *
          100
        : 0;

    const profitStatus =
      netProfit >= 0
        ? "BIASHARA INA FAIDA"
        : "BIASHARA INA HASARA";

   // RESPONSE
const report = {
  month:
    now.getUTCMonth() + 1,

  year:
    now.getUTCFullYear(),

  sales: {
    totalSales,
    totalProfit,
    count: salesCount
  },

  purchases: {
    totalBuy,
    totalSellValue,
    totalOrderProfit,
    remainingPurchaseProfit,
    count: orderCount
  },

  cash: {
    income,
    totalExpense
  },

  credit: {
    loansIssued,
    collected,
    overdueCount
  },

  summary: {
    netCashFlow:
      netPosition,
    totalBusinessProfit,
    netProfit,
    profitMargin,
    profitStatus
  }
};

await saveReportHistory(
  req,
  "monthly",
  report,
  start,
  end
);

return res.status(200).json(report);

  } catch (error) {
    console.log(
      "MONTHLY REPORT ERROR:",
      error
    );

    res.status(500).json({
      message:
        error.message
    });
  }
};
  
const getWeeklyReport = async (req, res) => {
  try {
    // SECURITY
    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const now = new Date();

    // CURRENT WEEK UTC
    const day = now.getUTCDay();
    const diff =
      day === 0 ? 6 : day - 1;

    const start = new Date(now);
    start.setUTCDate(
      now.getUTCDate() - diff
    );
    start.setUTCHours(
      0,
      0,
      0,
      0
    );

    const end =
      new Date(start);

    end.setUTCDate(
      start.getUTCDate() + 7
    );

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );

    // SALES
    const salesAgg =
      await Sale.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalSales: {
              $sum: "$totalAmount"
            },
            totalProfit: {
              $sum: "$totalProfit"
            },
            count: {
              $sum: 1
            }
          }
        }
      ]);

    const totalSales =
      salesAgg[0]?.totalSales || 0;

    const totalProfit =
      salesAgg[0]?.totalProfit || 0;

    const salesCount =
      salesAgg[0]?.count || 0;

    // PURCHASES
    const ordersAgg =
      await Order.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalBuy: {
              $sum: "$buyTotal"
            },
            totalSellValue: {
              $sum: "$sellTotal"
            },
            totalOrderProfit: {
              $sum: "$totalProfit"
            },
            count: {
              $sum: 1
            }
          }
        }
      ]);

    const totalBuy =
      ordersAgg[0]?.totalBuy || 0;

    const totalSellValue =
      ordersAgg[0]
        ?.totalSellValue || 0;

    const totalOrderProfit =
      ordersAgg[0]
        ?.totalOrderProfit || 0;

    const orderCount =
      ordersAgg[0]?.count || 0;

    // CASH
    const cashAgg =
      await CashEntry.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            status: "active",
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: "$type",
            total: {
              $sum: "$amount"
            }
          }
        }
      ]);

    let income = 0;
    let totalExpense = 0;

    cashAgg.forEach((c) => {
      if (c._id === "income") {
        income = c.total;
      }

      if (c._id === "expense") {
        totalExpense = c.total;
      }
    });

    // LOANS
    const loanAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalIssued: {
              $sum:
                "$principalAmount"
            }
          }
        }
      ]);

    const loansIssued =
      loanAgg[0]?.totalIssued || 0;

    // PAYMENTS
    const paymentAgg =
      await DebtPayment.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: null,
            totalCollected: {
              $sum: "$amount"
            }
          }
        }
      ]);

    const collected =
      paymentAgg[0]
        ?.totalCollected || 0;

    // OVERDUE
    const overdueCount =
      await DebtLoan.countDocuments({
        owner: ownerId,
        branch: branchId,
        status: "overdue"
      });

    // CALCULATIONS
    const netPosition =
      totalSales +
      income +
      collected -
      totalExpense -
      totalBuy;

      const remainingPurchaseProfit =
        totalOrderProfit -
        totalExpense;

    const totalBusinessProfit =
      totalProfit +
      totalOrderProfit;

    const netProfit =
      totalBusinessProfit -
      totalExpense;

    const profitMargin =
      totalBusinessProfit > 0
        ? (netProfit /
            totalBusinessProfit) *
          100
        : 0;

    const profitStatus =
      netProfit >= 0
        ? "BIASHARA INA FAIDA"
        : "BIASHARA INA HASARA";

    // RESPONSE
const report = {
  startDate: start,
  endDate: end,

  sales: {
    totalSales,
    totalProfit,
    count: salesCount
  },

  purchases: {
    totalBuy,
    totalSellValue,
    totalOrderProfit,
    remainingPurchaseProfit,
    count: orderCount
  },

  cash: {
    income,
    totalExpense
  },

  credit: {
    loansIssued,
    collected,
    overdueCount
  },

  summary: {
    netCashFlow: netPosition,
    totalBusinessProfit,
    netProfit,
    profitMargin,
    profitStatus
  }
};

await saveReportHistory(
  req,
  "weekly",
  report,
  start,
  end
);

return res.status(200).json(report);

  } catch (error) {
    console.log(
      "WEEKLY REPORT ERROR:",
      error
    );

    res.status(500).json({
      message:
        error.message
    });
  }
};
 
const getTopProductsReport = async (req, res) => {
  try {
    // SECURITY
    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );

    // THIS MONTH
    const now = new Date();

    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1
      )
    );

    const end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1
      )
    );

    const result =
      await Sale.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },

        {
          $unwind: "$items"
        },

        {
          $group: {
            _id: "$items.name",

            name: {
              $first:
                "$items.name"
            },

            qty: {
              $sum: {
                $ifNull: [
                  "$items.qty",
                  0
                ]
              }
            },

            revenue: {
              $sum: {
                $ifNull: [
                  "$items.total",
                  0
                ]
              }
            },

            profit: {
              $sum: {
                $multiply: [
                  {
                    $subtract: [
                      {
                        $ifNull: [
                          "$items.price",
                          0
                        ]
                      },
                      {
                        $ifNull: [
                          "$items.buyPrice",
                          0
                        ]
                      }
                    ]
                  },
                  {
                    $ifNull: [
                      "$items.qty",
                      0
                    ]
                  }
                ]
              }
            },

            count: {
              $sum: 1
            }
          }
        },

        {
          $sort: {
            qty: -1,
            revenue: -1
          }
        },

        {
          $limit: 20
        }
      ]);

 await saveReportHistory(
  req,
  "top_products",
  result,
  start,
  end
);

return res.status(200).json(
  result
);

  } catch (error) {
    console.log(
      "TOP PRODUCTS ERROR:",
      error
    );

    res.status(500).json({
      message:
        error.message
    });
  }
};
   
 const getCreditReport = async (req, res) => {
  try {
    // SECURITY
    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );

    // PERIOD FILTER
    const period =
      req.query.period || "today";

    const now =
      new Date();

    let start = null;

    let end =
      new Date(now);

    end.setHours(
      23,
      59,
      59,
      999
    );

    switch (period) {
      case "today":
        start =
          new Date(now);

        start.setHours(
          0,
          0,
          0,
          0
        );
        break;

      case "week":
        start =
          new Date(now);

        start.setDate(
          start.getDate() - 7
        );

        start.setHours(
          0,
          0,
          0,
          0
        );
        break;

      case "month":
        start =
          new Date(now);

        start.setDate(
          start.getDate() - 30
        );

        start.setHours(
          0,
          0,
          0,
          0
        );
        break;

      case "all":
        start = null;
        break;

      default:
        start =
          new Date(now);

        start.setHours(
          0,
          0,
          0,
          0
        );
    }

    // OUTSTANDING LOANS
    const outstandingAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            status: {
              $in: [
                "active",
                "overdue"
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            total: {
              $sum:
                "$balanceAmount"
            }
          }
        }
      ]);

    // LOAN SUMMARY
    const loanAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            ...(start && {
              createdAt: {
                $gte: start,
                $lte: end
              }
            })
          }
        },
        {
          $group: {
            _id: "$status",
            count: {
              $sum: 1
            },
            totalIssued: {
              $sum:
                "$principalAmount"
            }
          }
        }
      ]);

    // PAYMENTS
    const paymentAgg =
      await DebtPayment.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            ...(start && {
              createdAt: {
                $gte: start,
                $lte: end
              }
            })
          }
        },
        {
          $group: {
            _id: null,
            totalCollected: {
              $sum: "$amount"
            }
          }
        }
      ]);

    // EXPENSES
    const expenseAgg =
      await CashEntry.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            status: "active",
            type: "expense",
            ...(start && {
              createdAt: {
                $gte: start,
                $lte: end
              }
            })
          }
        },
        {
          $group: {
            _id: null,
            totalExpense: {
              $sum: "$amount"
            }
          }
        }
      ]);

    const outstanding =
      outstandingAgg[0]?.total || 0;

    let overdueCount = 0;
    let activeCount = 0;
    let paidCount = 0;

    let totalLoans = 0;
    let totalIssued = 0;

    loanAgg.forEach((l) => {
      totalLoans +=
        l.count || 0;

      totalIssued +=
        l.totalIssued || 0;

      if (
        l._id === "overdue"
      ) {
        overdueCount =
          l.count || 0;
      }

      if (
        l._id === "active"
      ) {
        activeCount =
          l.count || 0;
      }

      if (
        l._id === "paid"
      ) {
        paidCount =
          l.count || 0;
      }
    });

    const totalCollected =
      paymentAgg[0]
        ?.totalCollected || 0;

    const totalExpense =
      expenseAgg[0]
        ?.totalExpense || 0;

    const netCash =
      totalCollected -
      totalExpense;

    // RISKY CUSTOMERS
    const riskyCustomers =
      await DebtLoan.find({
        owner: ownerId,
        branch: branchId,
        status: "overdue"
      })
        .sort({
          balanceAmount: -1
        })
        .limit(5)
        .populate(
          "customer",
          "fullName phone riskScore"
        );

    const report = {
  summary: {
    totalLoans,
    totalIssued,
    totalCollected,
    outstanding,
    overdueCount,
    activeCount,
    paidCount
  },

  cashFlow: {
    issued: totalIssued,
    collected:
      totalCollected,
    expense:
      totalExpense,
    net: netCash
  },

  loanHealth: {
    active:
      activeCount,
    overdue:
      overdueCount,
    paid:
      paidCount
  },

  riskyCustomers,

  period
};

await saveReportHistory(
  req,
  "credit",
  report,
  start,
  end
);

return res.status(200).json(report);

  } catch (error) {
    console.log(
      "CREDIT REPORT ERROR:",
      error
    );

    res.status(500).json({
      message:
        error.message
    });
  }
};
 
 
 
 // ============================================
// GET CURRENT CREDIT REPORT HISTORY
//
// GET /reports/credit-history
//
// TODAY:
// - Build LIVE credit report
// - Save/update today's snapshot
//
// DATABASE:
// reportType = "credit_daily"
//
// MOBILE:
// reportType = "daily"
// ============================================

const getCurrentCreditReportHistory = async (
  req,
  res
) => {
  try {

    // ========================================
    // SECURITY
    // ========================================

    if (
      !req.ownerId ||
      !req.branchId
    ) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }


    // ========================================
    // VALIDATE OBJECT IDS
    // ========================================

    if (
      !mongoose.Types.ObjectId.isValid(
        req.ownerId
      ) ||
      !mongoose.Types.ObjectId.isValid(
        req.branchId
      )
    ) {
      return res.status(400).json({
        message: "Invalid owner or branch ID"
      });
    }


    // ========================================
    // OBJECT IDS
    // ========================================

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );


    // ========================================
    // TODAY
    //
    // getDateKey() should return:
    //
    // YYYY-MM-DD
    //
    // Example:
    // 2026-08-28
    // ========================================

    const today =
      getDateKey();


    // ========================================
    // TODAY START
    // ========================================

    const todayStart =
      new Date(
        `${today}T00:00:00.000Z`
      );


    // ========================================
    // TOMORROW
    // ========================================

    const tomorrow =
      new Date(
        todayStart
      );

    tomorrow.setUTCDate(
      tomorrow.getUTCDate() + 1
    );


    console.log(
      "📊 GET CURRENT CREDIT REPORT HISTORY:",
      {
        ownerId:
          String(ownerId),

        branchId:
          String(branchId),

        today,

        todayStart:
          todayStart.toISOString(),

        tomorrow:
          tomorrow.toISOString()
      }
    );


    // ========================================
    // BUILD LIVE REPORT
    // ========================================

    const report =
      await buildCreditHistoryReport(
        ownerId,
        branchId,
        today
      );


    // ========================================
    // SAFETY
    // ========================================

    if (
      !report
    ) {
      return res.status(500).json({
        message:
          "Failed to build credit report"
      });
    }


    console.log(
      "✅ LIVE CREDIT REPORT BUILT:",
      {
        branchId:
          String(branchId),

        date:
          today
      }
    );


    // ========================================
    // SAVE / UPDATE TODAY SNAPSHOT
    //
    // IMPORTANT:
    //
    // Do NOT create duplicate reports
    // for the same branch + date.
    //
    // One report per:
    //
    // owner
    // branch
    // credit_daily
    // periodStart
    // periodEnd
    // ========================================

    const savedHistory =
      await ReportHistory.findOneAndUpdate(

        {
          owner:
            ownerId,

          branch:
            branchId,

          reportType:
            "credit_daily",

          periodStart:
            todayStart,

          periodEnd:
            tomorrow
        },

        {
          $set: {

            owner:
              ownerId,

            branch:
              branchId,

            reportType:
              "credit_daily",

            periodStart:
              todayStart,

            periodEnd:
              tomorrow,

            report:
              report

          }
        },

        {
          upsert:
            true,

          new:
            true,

          setDefaultsOnInsert:
            true
        }
      );


    // ========================================
    // SAFETY CHECK
    // ========================================

    if (
      !savedHistory
    ) {

      console.error(
        "❌ FAILED TO SAVE CREDIT REPORT HISTORY"
      );

      return res.status(500).json({
        message:
          "Failed to save report history"
      });

    }


    // ========================================
    // MOBILE REPORT ID
    //
    // We intentionally return a stable ID:
    //
    // branchId_date
    //
    // Example:
    //
    // 68abc123_2026-08-28
    //
    // This allows mobile to safely identify
    // today's report.
    // ========================================

    const mobileReportId =
      `${String(
        req.branchId
      )}_${today}`;


    // ========================================
    // FINAL RESPONSE
    //
    // IMPORTANT:
    //
    // Mobile expects:
    //
    // {
    //   reports: [
    //     {
    //       id,
    //       date,
    //       reportType,
    //       branchId,
    //       createdAt,
    //       report
    //     }
    //   ]
    // }
    //
    // reportType = "daily"
    // ========================================

    const responseReport = {

      id:
        mobileReportId,

      date:
        today,

      reportType:
        "daily",

      branchId:
        String(
          req.branchId
        ),

      createdAt:
        savedHistory.createdAt ||
        new Date(),

      updatedAt:
        savedHistory.updatedAt ||
        new Date(),

      report:
        savedHistory.report ||
        report
    };


    // ========================================
    // LOG FINAL RESPONSE
    // ========================================

    console.log(
      "✅ CURRENT CREDIT REPORT HISTORY READY:",
      {
        id:
          responseReport.id,

        date:
          responseReport.date,

        branchId:
          responseReport.branchId,

        reportType:
          responseReport.reportType
      }
    );


    // ========================================
    // RETURN
    // ========================================

    return res.status(200).json({

      reports: [
        responseReport
      ]

    });


  } catch (error) {

    // ========================================
    // ERROR
    // ========================================

    console.error(
      "❌ GET CURRENT CREDIT REPORT HISTORY ERROR:",
      error
    );


    return res.status(500).json({
      message:
        error?.message ||
        "Failed to get current credit report history"
    });

  }
};
 
// ============================================
// GET CREDIT REPORT BY DATE
//
// GET /reports/credit-history/:date
//
// RULE:
//
// TODAY:
//    -> BUILD LIVE REPORT
//    -> SAVE / UPDATE SNAPSHOT
//
// OLD DATE:
//    -> FIND LOCKED SNAPSHOT
//    -> IF FOUND: RETURN IT
//    -> IF NOT FOUND:
//         BUILD REPORT FROM DATABASE
//         SAVE IT AS SNAPSHOT
//         RETURN IT
//
// DATABASE:
// credit_daily
//
// MOBILE:
// daily
// ============================================

const getCreditReportHistoryByDate =
  async (
    req,
    res
  ) => {

    try {

      // ========================================
      // SECURITY
      // ========================================

      if (
        !req.ownerId ||
        !req.branchId
      ) {

        return res.status(401).json({
          message:
            "Unauthorized"
        });

      }


      // ========================================
      // SELECTED DATE
      // ========================================

      const selectedDate =
        String(
          req.params.date
        );


      // ========================================
      // VALIDATE DATE FORMAT
      // ========================================

      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
          selectedDate
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid report date"
        });

      }


      // ========================================
      // VALIDATE OBJECT IDS
      // ========================================

      if (
        !mongoose.Types.ObjectId.isValid(
          req.ownerId
        ) ||
        !mongoose.Types.ObjectId.isValid(
          req.branchId
        )
      ) {

        return res.status(400).json({
          message:
            "Invalid owner or branch ID"
        });

      }


      // ========================================
      // OBJECT IDS
      // ========================================

      const ownerId =
        new mongoose.Types.ObjectId(
          req.ownerId
        );

      const branchId =
        new mongoose.Types.ObjectId(
          req.branchId
        );


      // ========================================
      // TODAY
      // ========================================

      const today =
        getDateKey();


      // ========================================
      // SELECTED DATE RANGE
      //
      // Example:
      //
      // 2026-08-26
      //
      // start:
      // 2026-08-26T00:00:00.000Z
      //
      // end:
      // 2026-08-27T00:00:00.000Z
      // ========================================

      const start =
        new Date(
          `${selectedDate}T00:00:00.000Z`
        );


      const end =
        new Date(start);


      end.setUTCDate(
        end.getUTCDate() + 1
      );


      // ========================================
      // DEBUG
      // ========================================

      console.log(
        "📊 CREDIT HISTORY REQUEST:",
        {
          ownerId:
            String(ownerId),

          branchId:
            String(branchId),

          selectedDate,

          today,

          start:
            start.toISOString(),

          end:
            end.toISOString()
        }
      );


      // ========================================
      // TODAY = LIVE
      //
      // Leo tunajenga report mpya
      // kutoka database.
      // ========================================

      if (
        selectedDate === today
      ) {

        console.log(
          "🌐 CREDIT HISTORY → LIVE TODAY:",
          selectedDate
        );


        // ======================================
        // BUILD LIVE REPORT
        // ======================================

        const report =
          await buildCreditHistoryReport(
            ownerId,
            branchId,
            selectedDate
          );


        if (
          !report
        ) {

          return res.status(500).json({
            message:
              "Failed to build credit report"
          });

        }


        // ======================================
        // SAVE / UPDATE TODAY SNAPSHOT
        // ======================================

        const savedHistory =
          await ReportHistory.findOneAndUpdate(

            {
              owner:
                ownerId,

              branch:
                branchId,

              reportType:
                "credit_daily",

              periodStart:
                start,

              periodEnd:
                end
            },

            {
              $set: {

                owner:
                  ownerId,

                branch:
                  branchId,

                reportType:
                  "credit_daily",

                periodStart:
                  start,

                periodEnd:
                  end,

                report:
                  report

              }
            },

            {
              upsert:
                true,

              new:
                true,

              setDefaultsOnInsert:
                true
            }

          );


        // ======================================
        // MOBILE RESPONSE
        // ======================================

        return res.status(200).json({

          id:
            `${String(
              req.branchId
            )}_${selectedDate}`,

          date:
            selectedDate,

          reportType:
            "daily",

          branchId:
            String(
              req.branchId
            ),

          createdAt:
            savedHistory?.createdAt ||
            new Date(),

          updatedAt:
            savedHistory?.updatedAt ||
            new Date(),

          report:
            savedHistory?.report ||
            report

        });

      }


      // ========================================
      // OLD / HISTORICAL DATE
      // ========================================

      console.log(
        "🔒 CREDIT HISTORY → HISTORICAL:",
        selectedDate
      );


      // ========================================
      // FIND LOCKED SNAPSHOT
      // ========================================

      let history =
        await ReportHistory.findOne({

          owner:
            ownerId,

          branch:
            branchId,

          reportType:
            "credit_daily",

          periodStart:
            start,

          periodEnd:
            end

        }).lean();


      // ========================================
      // SNAPSHOT EXISTS
      //
      // RETURN IT WITHOUT REBUILDING.
      //
      // Hii ndiyo LOCKED HISTORY.
      // ========================================

      if (
        history
      ) {

        console.log(
          "✅ HISTORICAL SNAPSHOT FOUND:",
          {
            branchId:
              String(branchId),

            date:
              selectedDate,

            reportId:
              String(history._id)
          }
        );


        return res.status(200).json({

          id:
            String(
              history._id
            ),

          date:
            selectedDate,

          reportType:
            "daily",

          branchId:
            String(
              req.branchId
            ),

          createdAt:
            history.createdAt,

          updatedAt:
            history.updatedAt,

          report:
            history.report

        });

      }


      // ========================================
      // SNAPSHOT DOES NOT EXIST
      //
      // IMPORTANT:
      //
      // Badala ya kurudisha 404,
      // tutajenga report kutoka database.
      //
      // Hii inasaidia historical dates
      // ambazo hazikuwahi kuwa saved.
      // ========================================

      console.warn(
        "⚠️ HISTORICAL SNAPSHOT NOT FOUND:",
        {
          branchId:
            String(branchId),

          date:
            selectedDate
        }
      );


      console.log(
        "🔄 BUILDING HISTORICAL CREDIT REPORT:",
        selectedDate
      );


      // ========================================
      // BUILD REPORT FROM DATABASE
      // ========================================

      const report =
        await buildCreditHistoryReport(
          ownerId,
          branchId,
          selectedDate
        );


      if (
        !report
      ) {

        return res.status(500).json({
          message:
            "Failed to build historical credit report"
        });

      }


      // ========================================
      // SAVE HISTORICAL SNAPSHOT
      //
      // Baada ya kujengwa,
      // tunai-save ili next time
      // isihitaji kujengwa tena.
      // ========================================

      const savedHistory =
        await ReportHistory.findOneAndUpdate(

          {
            owner:
              ownerId,

            branch:
              branchId,

            reportType:
              "credit_daily",

            periodStart:
              start,

            periodEnd:
              end
          },

          {
            $setOnInsert: {

              owner:
                ownerId,

              branch:
                branchId,

              reportType:
                "credit_daily",

              periodStart:
                start,

              periodEnd:
                end,

              report:
                report

            }

          },

          {
            upsert:
              true,

            new:
              true,

            setDefaultsOnInsert:
              true
          }

        );


      // ========================================
      // SAFETY
      // ========================================

      if (
        !savedHistory
      ) {

        return res.status(500).json({
          message:
            "Failed to save historical credit report"
        });

      }


      // ========================================
      // FINAL DEBUG
      // ========================================

      console.log(
        "✅ HISTORICAL CREDIT REPORT READY:",
        {
          id:
            String(
              savedHistory._id
            ),

          branchId:
            String(branchId),

          date:
            selectedDate,

          totalLoans:
            savedHistory.report
              ?.summary
              ?.totalLoans,

          totalPaid:
            savedHistory.report
              ?.summary
              ?.totalPaid,

          totalLoanAmount:
            savedHistory.report
              ?.summary
              ?.totalLoanAmount
        }
      );


      // ========================================
      // RETURN HISTORICAL REPORT
      // ========================================

      return res.status(200).json({

        id:
          String(
            savedHistory._id
          ),

        date:
          selectedDate,

        reportType:
          "daily",

        branchId:
          String(
            req.branchId
          ),

        createdAt:
          savedHistory.createdAt,

        updatedAt:
          savedHistory.updatedAt,

        report:
          savedHistory.report ||
          report

      });


    } catch (error) {

      // ========================================
      // ERROR
      // ========================================

      console.error(
        "❌ GET CREDIT REPORT BY DATE ERROR:",
        error
      );


      return res.status(500).json({

        message:
          error?.message ||
          "Failed to get credit report history"

      });

    }

  };
 

 

 const getExpenseReport = async (req, res) => {
  try {
    // SECURITY
    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );
const today = new Date();
today.setUTCHours(
  0,0,0,0
);

const tomorrow =
  new Date(today);

tomorrow.setUTCDate(
  today.getUTCDate() + 1
);

const todayExpense =
  await CashEntry.aggregate([
    {
      $match: {
        owner: ownerId,
        branch: branchId,
        status: "active",
        type: "expense",
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      }
    },
    {
      $group: {
        _id: null,
        total: {
          $sum: "$amount"
        }
      }
    }
  ]);

    // THIS MONTH
    const now = new Date();

    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1
      )
    );

    const end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth() + 1,
        1
      )
    );

    // CATEGORY AGGREGATION
    const expenseAgg =
      await CashEntry.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            status: "active",
            type: "expense",
            createdAt: {
              $gte: start,
              $lt: end
            }
          }
        },
        {
          $group: {
            _id: "$category",
            category: {
              $first:
                "$category"
            },
            amount: {
              $sum: "$amount"
            },
            count: {
              $sum: 1
            }
          }
        },
        {
          $sort: {
            amount: -1
          }
        }
      ]);

    // TOTAL
    const totalEntries =
  expenseAgg.reduce(
    (sum, x) =>
      sum + (x.count || 0),
    0
  );
    const totalExpense =
      expenseAgg.reduce(
        (sum, x) =>
          sum +
          (x.amount || 0),
        0
      );

    // TOP 3
    const top3 =
      expenseAgg.slice(0, 3);

    // RECENT EXPENSES
    const recent =
      await CashEntry.find({
        owner: ownerId,
        branch: branchId,
        status: "active",
        type: "expense",
        createdAt: {
          $gte: start,
          $lt: end
        }
      })
        .sort({
          createdAt: -1
        })
        .limit(10)
        .select(
          "category amount createdAt"
        )
        .lean();

    const report = {
  summary: {
    totalExpense,
    entries: totalEntries,
    todayExpense:
      todayExpense[0]?.total || 0
  },

  categories:
    expenseAgg,

  top3,

  recent
};

await saveReportHistory(
  req,
  "expense",
  report,
  start,
  end
);

return res.status(200).json(
  report
);

  } catch (error) {
    console.log(
      "EXPENSE REPORT ERROR:",
      error
    );

    res.status(500).json({
      message:
        error.message
    });
  }
 };


const getReportHistory = async (req, res) => {
  try {

    // ============================================
    // SECURITY
    // ============================================

    if (
      !req.ownerId ||
      !req.branchId
    ) {

      return res.status(401).json({
        message:
          "Unauthorized"
      });

    }


    // ============================================
    // PAGINATION
    // ============================================

    const page =
      Math.max(
        Number(
          req.query.page
        ) || 1,
        1
      );

    const limit =
      Math.max(
        Number(
          req.query.limit
        ) || 50,
        1
      );

    const skip =
      (page - 1) *
      limit;


    // ============================================
    // BASE FILTER
    //
    // Hii history ni ya:
    // OWNER + ACTIVE BRANCH
    // ============================================

    const filter = {

      owner:
        req.ownerId,

      branch:
        req.branchId,

      // ========================================
      // MUHIMU:
      //
      // Tunataka DAILY HISTORY pekee.
      //
      // Mfumo wako una records mbili zinazoweza
      // kuwakilisha daily:
      //
      // "daily"
      // "credit_daily"
      //
      // ========================================

      reportType: {
        $in: [
          "daily",
          "credit_daily"
        ]
      }

    };


    // ============================================
    // OPTIONAL REPORT TYPE
    //
    // Kama frontend imetuma reportType,
    // tunaiheshimu lakini bado ndani ya
    // daily-compatible types.
    // ============================================

    if (
      req.query.reportType
    ) {

      const requestedType =
        String(
          req.query.reportType
        );

      if (
        [
          "daily",
          "credit_daily"
        ].includes(
          requestedType
        )
      ) {

        filter.reportType =
          requestedType;

      } else {

        // ======================================
        // Requested report type si daily.
        //
        // Tunarudisha empty result badala ya
        // kuchanganya weekly/monthly n.k.
        // ======================================

        return res.status(200).json({

          total:
            0,

          page,

          pages:
            0,

          reports:
            []

        });

      }

    }


    // ============================================
    // GET REPORTS
    //
    // DATE ndiyo ya muhimu zaidi kwenye history.
    //
    // Tunasort kwa:
    //
    // 1. date DESC
    // 2. createdAt DESC
    //
    // Hii inasaidia tarehe zenye kazi
    // zisiondoke kwa sababu record nyingine
    // iliundwa baadaye.
    // ============================================

    const reports =
      await ReportHistory.find(
        filter
      )
        .sort({

          // ====================================
          // PRIMARY SORT
          // ====================================

          "report.date":
            -1,

          // ====================================
          // SECONDARY SORT
          // ====================================

          periodStart:
            -1,

          // ====================================
          // FALLBACK
          // ====================================

          createdAt:
            -1

        })

        .skip(
          skip
        )

        .limit(
          limit
        )

        .lean();


    // ============================================
    // TOTAL
    // ============================================

    const total =
      await ReportHistory.countDocuments(
        filter
      );


    // ============================================
    // NORMALIZE RESPONSE
    //
    // Baadhi ya old records zinaweza kuwa na:
    //
    // reportType = credit_daily
    //
    // lakini mobile inatarajia:
    //
    // reportType = daily
    //
    // Kwa hiyo tunafanya mapping hapa tu.
    //
    // HATUBADILISHI DATABASE.
    // ============================================

    const normalizedReports =
      reports.map(
        (
          report
        ) => {

          const reportDate =
            report?.report?.date ||
            (
              report?.periodStart
                ? new Date(
                    report.periodStart
                  )
                    .toISOString()
                    .slice(
                      0,
                      10
                    )
                : null
            );


          return {

            ...report,

            // ==================================
            // STABLE MOBILE ID
            // ==================================

            id:
              reportDate
                ? `${String(
                    req.branchId
                  )}_${reportDate}`
                : String(
                    report._id
                  ),

            // ==================================
            // DATE
            // ==================================

            date:
              reportDate,

            // ==================================
            // MOBILE REPORT TYPE
            // ==================================

            reportType:
              "daily",

            // ==================================
            // BRANCH ID
            // ==================================

            branchId:
              String(
                req.branchId
              )

          };

        }
      );


    // ============================================
    // REMOVE DUPLICATE DATES
    //
    // Kuna uwezekano branch ina:
    //
    // daily
    // +
    // credit_daily
    //
    // kwa tarehe ile ile.
    //
    // Mobile inahitaji tarehe moja tu.
    //
    // Tunahifadhi record ya kwanza kwa
    // sababu tayari tume-sort DESC.
    // ============================================

    const seenDates =
      new Set();

    const uniqueReports =
      normalizedReports.filter(
        (
          report
        ) => {

          const date =
            report?.date;

          if (
            !date
          ) {

            return false;

          }

          if (
            seenDates.has(
              date
            )
          ) {

            return false;

          }

          seenDates.add(
            date
          );

          return true;

        }
      );


    // ============================================
    // FINAL TOTAL
    //
    // Pagination total bado inatoka DB.
    // Lakini reports zinazosafirishwa zina
    // unique dates.
    // ============================================

    return res.status(200).json({

      total,

      page,

      pages:
        Math.ceil(
          total /
          limit
        ),

      reports:
        uniqueReports

    });


  } catch (error) {

    // ============================================
    // ERROR
    // ============================================

    console.error(
      "❌ REPORT HISTORY ERROR:",
      error
    );


    return res.status(500).json({

      message:
        error?.message ||
        "Failed to load report history"

    });

  }
};
const getReportHistoryById = async (req, res) => {
  try {

    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const report =
      await ReportHistory.findOne({
        _id: req.params.id,
        owner: req.ownerId,
        branch: req.branchId
      }).lean();

    if (!report) {
      return res.status(404).json({
        message: "Report not found"
      });
    }

    return res.status(200).json(report);

  } catch (error) {

    console.log(
      "REPORT DETAILS ERROR:",
      error
    );

    res.status(500).json({
      message: error.message
    });

  }
};
 module.exports = {
  getDailyReport,
  getReportHistoryById,
  getReportHistory,
  getWeeklyReport,
  getMonthlyReport,
  getTopProductsReport,
  getCreditReport,
  getExpenseReport,
   getCurrentCreditReportHistory,

  getCreditReportHistoryByDate,

  getInventoryReport
};
