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
// ============================================

const buildCreditHistoryReport =
  async (
    ownerId,
    branchId,
    date
  ) => {

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
    // ========================================

    const loansAgg =
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

            totalLoans: {
              $sum: 1
            },

            totalLoanAmount: {
              $sum: "$principalAmount"
            }
          }
        }
      ]);


    // ========================================
    // PAYMENTS ON THIS DATE
    // ========================================

    const paymentsAgg =
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

            totalPayments: {
              $sum: 1
            },

            totalPaid: {
              $sum: "$amount"
            }
          }
        }
      ]);


    // ========================================
    // ACTIVE LOANS
    //
    // CURRENT STATUS
    // ========================================

    const activeLoans =
      await DebtLoan.countDocuments({
        owner: ownerId,
        branch: branchId,
        status: "active"
      });


    // ========================================
    // PAID LOANS
    // ========================================

    const paidLoans =
      await DebtLoan.countDocuments({
        owner: ownerId,
        branch: branchId,
        status: "paid"
      });


    // ========================================
    // OVERDUE LOANS
    // ========================================

    const overdueLoans =
      await DebtLoan.countDocuments({
        owner: ownerId,
        branch: branchId,
        status: "overdue"
      });


    // ========================================
    // OUTSTANDING
    // ========================================

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

            totalOutstandingCapital: {
              $sum: "$balanceAmount"
            }
          }
        }
      ]);


    // ========================================
    // OVERDUE AMOUNT
    // ========================================

    const overdueAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId,
            status: "overdue"
          }
        },
        {
          $group: {
            _id: null,

            overdueAmount: {
              $sum: "$balanceAmount"
            }
          }
        }
      ]);


    // ========================================
    // CUSTOMERS
    //
    // Using unique customers from loans
    // ========================================

    const customersAgg =
      await DebtLoan.aggregate([
        {
          $match: {
            owner: ownerId,
            branch: branchId
          }
        },
        {
          $group: {
            _id: "$customer"
          }
        },
        {
          $count: "total"
        }
      ]);


    // ========================================
    // VALUES
    // ========================================

    const totalLoans =
      loansAgg[0]?.totalLoans || 0;

    const totalLoanAmount =
      loansAgg[0]?.totalLoanAmount || 0;

    const totalPayments =
      paymentsAgg[0]?.totalPayments || 0;

    const totalPaid =
      paymentsAgg[0]?.totalPaid || 0;

    const totalOutstandingCapital =
      outstandingAgg[0]
        ?.totalOutstandingCapital || 0;

    const overdueAmount =
      overdueAgg[0]
        ?.overdueAmount || 0;

    const customers =
      customersAgg[0]?.total || 0;


    // ========================================
    // FINAL REPORT
    // ========================================

    return {

      summary: {

        totalLoans,

        totalPaid,

        totalLoanAmount,

        totalPayments,

        totalRefundAmount: 0,

        netCollection:
          totalPaid,

        totalOutstandingCapital,

        totalBalance:
          totalOutstandingCapital,

        customers,

        activeLoans,

        paidLoans,

        overdueLoans,

        overdueAmount

      },


      credit: {

        loansIssued:
          totalLoans,

        amountIssued:
          totalLoanAmount,

        paymentsCollected:
          totalPaid,

        refunds: 0,

        netCollection:
          totalPaid,

        outstandingBalance:
          totalOutstandingCapital

      }

    };

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
    // MUHIMU:
    // HAPA TUNAHESABU ONLY:
    //
    // type = "payment"
    //
    // Refund haitahesabiwa hapa.
    // ============================================================

    const paymentAgg =
      await DebtPayment.aggregate([
        {
          $match: {
            ...todayFilter,

            type: "payment",

            status: "posted",
          },
        },

        {
          $group: {
            _id: null,

            totalCollected: {
              $sum: {
                $ifNull: [
                  "$amount",
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
    // HAPA TUNAHESABU ONLY:
    //
    // type = "refund"
    //
    // Refund haiwezi kuingia kwenye payments.
    // ============================================================

    const refundAgg =
      await DebtPayment.aggregate([
        {
          $match: {
            ...todayFilter,

            type: "refund",

            status: "posted",
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
    // Malipo halisi yaliyobaki baada ya refunds.
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
    // Refund inapunguza cash flow.
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
    // Inahusiana na loans zilizotolewa leo.
    // Tunatumia actual payment, sio refund.
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

        loansIssued,

        loansIssuedCount,

        totalLoans,

        totalLoanAmount:
          loansIssued,

        payments:
          debtCollected,

        paymentsCount,

        refunds,

        refundsCount,

        netCollection,

        outstandingCapital,

        overdueLoans,

        overdueAmount,

        customers,
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

const getCurrentCreditReportHistory =
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
      // TODAY UTC
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
      // SAVE TODAY SNAPSHOT
      // ========================================

      const savedHistory =
        await ReportHistory.findOneAndUpdate(

          {
            owner: ownerId,
            branch: branchId,
            reportType: "credit_daily",
            periodStart: todayStart,
            periodEnd: tomorrow
          },

          {
            $set: {
              owner: ownerId,
              branch: branchId,
              reportType: "credit_daily",
              periodStart: todayStart,
              periodEnd: tomorrow,
              report
            }
          },

          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }

        );


      // ========================================
      // MOBILE RESPONSE
      // ========================================

      return res.status(200).json({

        reports: [

          {
            id:
              `${req.branchId}_${today}`,

            date:
              today,

            // IMPORTANT:
            // Mobile expects "daily"
            reportType:
              "daily",

            branchId:
              String(
                req.branchId
              ),

            createdAt:
              savedHistory?.createdAt ||
              new Date().toISOString(),

            report

          }

        ]

      });


    } catch (error) {

      console.error(
        "GET CURRENT CREDIT REPORT HISTORY ERROR:",
        error
      );

      return res.status(500).json({
        message:
          error.message
      });

    }

  };

 
 // ============================================
// GET CREDIT REPORT BY DATE
//
// GET /reports/credit-history/:date
//
// RULE:
// TODAY      -> LIVE
// OLD DATE   -> LOCKED SNAPSHOT
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
      // TODAY = LIVE
      // ========================================

      if (
        selectedDate === today
      ) {

        const report =
          await buildCreditHistoryReport(
            ownerId,
            branchId,
            selectedDate
          );


        // ======================================
        // ALSO UPDATE TODAY SNAPSHOT
        // ======================================

        const start =
          new Date(
            `${selectedDate}T00:00:00.000Z`
          );

        const end =
          new Date(start);

        end.setUTCDate(
          end.getUTCDate() + 1
        );


        const savedHistory =
          await ReportHistory.findOneAndUpdate(

            {
              owner: ownerId,
              branch: branchId,
              reportType: "credit_daily",
              periodStart: start,
              periodEnd: end
            },

            {
              $set: {
                owner: ownerId,
                branch: branchId,
                reportType: "credit_daily",
                periodStart: start,
                periodEnd: end,
                report
              }
            },

            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true
            }

          );


        // ======================================
        // MOBILE RESPONSE
        // ======================================

        return res.status(200).json({

          id:
            `${req.branchId}_${selectedDate}`,

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
            new Date().toISOString(),

          report

        });

      }


      // ========================================
      // HISTORICAL DATE
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
      // FIND LOCKED SNAPSHOT
      // ========================================

      const history =
        await ReportHistory.findOne({

          owner: ownerId,

          branch: branchId,

          reportType:
            "credit_daily",

          periodStart:
            start,

          periodEnd:
            end

        }).lean();


      // ========================================
      // NOT FOUND
      // ========================================

      if (!history) {

        return res.status(404).json({

          message:
            "Report not found",

          date:
            selectedDate,

          reportType:
            "daily",

          branchId:
            String(
              req.branchId
            )

        });

      }


      // ========================================
      // RETURN HISTORICAL SNAPSHOT
      // ========================================

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

        report:
          history.report

      });


    } catch (error) {

      console.error(
        "GET CREDIT REPORT BY DATE ERROR:",
        error
      );

      return res.status(500).json({
        message:
          error.message
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

    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    const page =
      Number(req.query.page) || 1;

    const limit =
      Number(req.query.limit) || 20;

    const skip =
      (page - 1) * limit;

    const filter = {
      owner: req.ownerId,
      branch: req.branchId
    };

    if (req.query.reportType) {
      filter.reportType =
        req.query.reportType;
    }

    const reports =
      await ReportHistory.find(filter)
        .sort({
          createdAt: -1
        })
        .skip(skip)
        .limit(limit)
        .lean();

    const total =
      await ReportHistory.countDocuments(
        filter
      );

    return res.status(200).json({
      total,
      page,
      pages: Math.ceil(total / limit),
      reports
    });

  } catch (error) {

    console.log(
      "REPORT HISTORY ERROR:",
      error
    );

    res.status(500).json({
      message: error.message
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
