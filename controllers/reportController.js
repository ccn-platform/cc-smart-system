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

  ```javascript

const saveReportHistory = async (
  req,
  reportType,
  report,
  periodStart = null,
  periodEnd = null
) => {
  try {

    // =====================================================
    // BASIC SECURITY
    // =====================================================

    if (!req.ownerId || !req.branchId) {
      console.error(
        "SAVE REPORT HISTORY: Missing ownerId or branchId"
      );

      return;
    }


    // =====================================================
    // DAILY REPORT
    // =====================================================
    // Daily report inapaswa kuwa na RECORD MOJA TU
    // kwa tarehe husika.
    //
    // Tunatumia:
    // owner + branch + reportType + periodStart
    //
    // Hivyo:
    // 09 Aug -> record moja
    // 10 Aug -> record nyingine
    //
    // Kufungua Daily Report mara nyingi hakutatengeneza
    // records mpya; ita-update record iliyopo.
    // =====================================================

    const filter =
      reportType === "daily"
        ? {
            owner: req.ownerId,
            branch: req.branchId,
            reportType: "daily",
            periodStart: periodStart
          }
        : {
            owner: req.ownerId,
            branch: req.branchId,
            reportType,
            periodStart,
            periodEnd
          };


    // =====================================================
    // SAVE / UPDATE
    // =====================================================

    await ReportHistory.findOneAndUpdate(
      filter,
      {
        owner: req.ownerId,
        branch: req.branchId,
        reportType,
        periodStart,
        periodEnd,
        report
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true
      }
    );


  } catch (err) {

    // IMPORTANT:
    // Tatizo la history lisivunje Daily Report yenyewe.
    console.error(
      "SAVE REPORT HISTORY:",
      err.message
    );

  }
};
```



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

    // =====================================================
    // SECURITY
    // =====================================================

    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }


    // =====================================================
    // IDS
    // =====================================================

    const ownerId =
      new mongoose.Types.ObjectId(
        req.ownerId
      );

    const branchId =
      new mongoose.Types.ObjectId(
        req.branchId
      );


    // =====================================================
    // TANZANIA DATE
    // Tanzania = UTC + 3
    //
    // Tunatumia timezone hii kwa Daily Snapshot
    // ili siku ibaki sahihi kwa Tanzania.
    // =====================================================

    const now = new Date();

    const TANZANIA_OFFSET_MS =
      3 * 60 * 60 * 1000;


    // Muda wa sasa wa Tanzania
    const tanzaniaNow =
      new Date(
        now.getTime() +
        TANZANIA_OFFSET_MS
      );


    // =====================================================
    // LOCAL DATE YA TANZANIA
    // =====================================================

    const year =
      tanzaniaNow.getUTCFullYear();

    const month =
      tanzaniaNow.getUTCMonth();

    const day =
      tanzaniaNow.getUTCDate();


    // =====================================================
    // MWANZO WA SIKU YA TANZANIA
    //
    // Mfano:
    // Tanzania:
    // 2026-08-09 00:00
    //
    // UTC:
    // 2026-08-08 21:00
    // =====================================================

    const today =
      new Date(
        Date.UTC(
          year,
          month,
          day,
          0,
          0,
          0,
          0
        ) -
        TANZANIA_OFFSET_MS
      );


    // =====================================================
    // MWISHO / START YA SIKU INAYOFUATA
    // =====================================================

    const tomorrow =
      new Date(
        today.getTime() +
        24 * 60 * 60 * 1000
      );


    // =====================================================
    // SALES
    // =====================================================

    const salesAgg =
      await Sale.aggregate([

        {
          $match: {
            owner: ownerId,
            branch: branchId,

            createdAt: {
              $gte: today,
              $lt: tomorrow
            }
          }
        },

        {
          $group: {
            _id: null,

            totalSales: {
              $sum:
                "$totalAmount"
            },

            totalProfit: {
              $sum:
                "$totalProfit"
            },

            count: {
              $sum: 1
            }
          }
        }

      ]);


    const totalSales =
      salesAgg[0]?.totalSales || 0;


    const totalSalesProfit =
      salesAgg[0]?.totalProfit || 0;


    const salesCount =
      salesAgg[0]?.count || 0;


    // =====================================================
    // PURCHASES
    // =====================================================

    const ordersAgg =
      await Order.aggregate([

        {
          $match: {
            owner: ownerId,
            branch: branchId,

            createdAt: {
              $gte: today,
              $lt: tomorrow
            }
          }
        },

        {
          $group: {
            _id: null,

            totalBuy: {
              $sum:
                "$buyTotal"
            },

            totalSellValue: {
              $sum:
                "$sellTotal"
            },

            totalOrderProfit: {
              $sum:
                "$totalProfit"
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
      ordersAgg[0]?.totalSellValue || 0;


    const totalOrderProfit =
      ordersAgg[0]?.totalOrderProfit || 0;


    const orderCount =
      ordersAgg[0]?.count || 0;


    // =====================================================
    // CASH
    // =====================================================

    const cashAgg =
      await CashEntry.aggregate([

        {
          $match: {
            owner: ownerId,
            branch: branchId,

            status: "active",

            createdAt: {
              $gte: today,
              $lt: tomorrow
            }
          }
        },

        {
          $group: {
            _id: "$type",

            total: {
              $sum:
                "$amount"
            }
          }
        }

      ]);


    let cashIncome = 0;

    let totalExpense = 0;


    cashAgg.forEach((c) => {

      if (
        c._id === "income"
      ) {
        cashIncome =
          c.total || 0;
      }


      if (
        c._id === "expense"
      ) {
        totalExpense =
          c.total || 0;
      }

    });


    // =====================================================
    // LOANS ISSUED TODAY
    // =====================================================

    const loanAgg =
      await DebtLoan.aggregate([

        {
          $match: {
            owner: ownerId,
            branch: branchId,

            createdAt: {
              $gte: today,
              $lt: tomorrow
            }
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


    let loansIssued = 0;

    let loanCount = 0;

    let activeCount = 0;

    let overdueCountToday = 0;

    let paidCount = 0;


    loanAgg.forEach((loan) => {

      loanCount +=
        loan.count || 0;


      loansIssued +=
        loan.totalIssued || 0;


      if (
        loan._id === "active"
      ) {
        activeCount =
          loan.count || 0;
      }


      if (
        loan._id === "overdue"
      ) {
        overdueCountToday =
          loan.count || 0;
      }


      if (
        loan._id === "paid"
      ) {
        paidCount =
          loan.count || 0;
      }

    });


    // =====================================================
    // PAYMENTS COLLECTED TODAY
    // =====================================================

    const paymentAgg =
      await DebtPayment.aggregate([

        {
          $match: {
            owner: ownerId,
            branch: branchId,

            createdAt: {
              $gte: today,
              $lt: tomorrow
            }
          }
        },

        {
          $group: {
            _id: null,

            totalCollected: {
              $sum:
                "$amount"
            }
          }
        }

      ]);


    const debtCollected =
      paymentAgg[0]
        ?.totalCollected || 0;


    // =====================================================
    // CURRENT OUTSTANDING CREDIT
    //
    // Hii ni balance ya mikopo ambayo bado haijalipwa.
    //
    // Hatuwekei tarehe hapa kwa sababu tunataka
    // hali halisi ya credit wakati report inafunguliwa.
    // =====================================================

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

            totalOutstanding: {
              $sum:
                "$balanceAmount"
            }
          }
        }

      ]);


    const outstanding =
      outstandingAgg[0]
        ?.totalOutstanding || 0;


    // =====================================================
    // CURRENT OVERDUE
    //
    // Hii ni overdue iliyopo sasa kwenye biashara,
    // sio tu loans zilizotengenezwa leo.
    //
    // Tunaiweka hivi ili app ya zamani iendelee kupata
    // overdueCount kama ilivyokuwa awali.
    // =====================================================

    const overdueCount =
      await DebtLoan.countDocuments({

        owner: ownerId,

        branch: branchId,

        status: "overdue"

      });


    // =====================================================
    // CALCULATIONS
    // =====================================================

    const netPosition =
      totalSales +
      cashIncome +
      debtCollected -
      totalExpense -
      totalBuy;


    const remainingPurchaseProfit =
      totalOrderProfit -
      totalExpense;


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
          ) * 100
        : 0;


    const profitStatus =
      netProfit >= 0
        ? "BIASHARA INA FAIDA"
        : "BIASHARA INA HASARA";


    // =====================================================
    // RESPONSE
    //
    // IMPORTANT:
    // Fields za zamani zimeachwa vilevile.
    // Tumeongeza fields mpya tu.
    // =====================================================

    const report = {

      // Tarehe la Daily Snapshot
      date: today,

      // Muda report ilipofunguliwa/ku-refreshiwa
      snapshotAt: new Date(),


      // ===================================================
      // SALES
      // ===================================================

      sales: {

        totalSales,

        totalSalesProfit,

        count:
          salesCount

      },


      // ===================================================
      // PURCHASES
      // ===================================================

      purchases: {

        totalBuy,

        totalSellValue,

        totalOrderProfit,

        remainingPurchaseProfit,

        count:
          orderCount

      },


      // ===================================================
      // CASH
      // ===================================================

      cash: {

        // OLD FIELD
        cashIncome,

        // OLD FIELD
        totalExpense

      },


      // ===================================================
      // CREDIT
      // ===================================================

      credit: {

        // OLD FIELD
        loansIssued,

        // OLD FIELD
        debtCollected,

        // OLD FIELD
        overdueCount,

        // NEW
        outstanding,

        // NEW
        activeCount,

        // NEW
        paidCount,

        // NEW
        loanCount

      },


      // ===================================================
      // SUMMARY
      // ===================================================

      summary: {

        netCashFlow:
          netPosition,

        totalBusinessProfit,

        netProfit,

        profitMargin,

        profitStatus

      }

    };


    // =====================================================
    // SAVE / UPDATE DAILY SNAPSHOT
    //
    // Kwa sababu tunatumia:
    //
    // reportType = "daily"
    // periodStart = today
    // periodEnd = tomorrow
    //
    // saveReportHistory() yako iliyopo ita-update
    // report ya siku hiyo badala ya kutengeneza nyingine.
    // =====================================================

    await saveReportHistory(

      req,

      "daily",

      report,

      today,

      tomorrow

    );


    // =====================================================
    // RESPONSE
    // =====================================================

    return res.status(200).json(
      report
    );


  } catch (error) {

    console.log(
      "DAILY REPORT ERROR:",
      error
    );


    return res.status(500).json({

      message:
        error.message

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

   end.setUTCHours(23, 59, 59, 999);

    switch (period) {
      case "today":
        start =
          new Date(now);

        start.setUTCHour(
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
  ```javascript
const getReportHistory = async (req, res) => {
  try {

    // =====================================================
    // SECURITY
    // =====================================================

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


    // =====================================================
    // BASE FILTER
    // =====================================================

    const filter = {
      owner: req.ownerId,
      branch: req.branchId
    };


    // =====================================================
    // REPORT TYPE FILTER
    // =====================================================

    if (req.query.reportType) {
      filter.reportType =
        req.query.reportType;
    }


    // =====================================================
    // DAILY HISTORY
    //
    // Daily report:
    // TAREHE MOJA = REPORT MOJA
    //
    // Hata kama database ina duplicate za zamani,
    // tunachukua report iliyotengenezwa/updated mwisho.
    // =====================================================

    if (
      !req.query.reportType ||
      req.query.reportType === "daily"
    ) {

      const dailyFilter = {
        owner: req.ownerId,
        branch: req.branchId,
        reportType: "daily"
      };


      // ===================================================
      // GET UNIQUE DAILY REPORTS
      // ===================================================

      const dailyReports =
        await ReportHistory.aggregate([

          {
            $match: dailyFilter
          },


          // -----------------------------------------------
          // MPYA ZAIDI KWANZA
          // -----------------------------------------------

          {
            $sort: {
              periodStart: -1,
              createdAt: -1,
              updatedAt: -1
            }
          },


          // -----------------------------------------------
          // GROUP KWA TAREHE
          //
          // periodStart ya Daily tayari inawakilisha
          // mwanzo wa siku husika.
          // -----------------------------------------------

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$periodStart"
                }
              },

              report: {
                $first: "$$ROOT"
              }
            }
          },


          // -----------------------------------------------
          // RUDISHA DOCUMENT YA REPORT
          // -----------------------------------------------

          {
            $replaceRoot: {
              newRoot: "$report"
            }
          },


          // -----------------------------------------------
          // TAREHE MPYA KWANZA
          // -----------------------------------------------

          {
            $sort: {
              periodStart: -1,
              createdAt: -1
            }
          },


          // -----------------------------------------------
          // PAGINATION
          // -----------------------------------------------

          {
            $skip: skip
          },

          {
            $limit: limit
          }

        ]);


      // ===================================================
      // COUNT UNIQUE DAILY DATES
      // ===================================================

      const totalResult =
        await ReportHistory.aggregate([

          {
            $match: dailyFilter
          },

          {
            $group: {
              _id: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$periodStart"
                }
              }
            }
          },

          {
            $count: "total"
          }

        ]);


      const total =
        totalResult[0]?.total || 0;


      // ===================================================
      // RESPONSE
      // ===================================================

      return res.status(200).json({
        total,
        page,
        pages:
          Math.ceil(
            total / limit
          ),
        reports:
          dailyReports
      });
    }


    // =====================================================
    // OTHER REPORTS
    //
    // Weekly
    // Monthly
    // Credit
    // Expense
    // Inventory
    // Top Products
    //
    // HAZIBADILISHWA.
    // =====================================================

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
      pages:
        Math.ceil(
          total / limit
        ),
      reports
    });


  } catch (error) {

    console.log(
      "REPORT HISTORY ERROR:",
      error
    );


    return res.status(500).json({
      message:
        error.message
    });

  }
};
```

```javascript
const getReportHistoryById = async (req, res) => {
  try {

    // =====================================================
    // SECURITY
    // =====================================================

    if (!req.ownerId || !req.branchId) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }


    // =====================================================
    // VALIDATE REPORT ID
    // =====================================================

    const reportId =
      req.params.id;

    if (
      !mongoose.Types.ObjectId.isValid(
        reportId
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid report ID"
      });
    }


    // =====================================================
    // FIND EXACT REPORT
    //
    // Muhimu:
    // HATUHESABU REPORT TENA HAPA.
    //
    // Tunachukua snapshot ileile iliyohifadhiwa
    // wakati report ilipofunguliwa/ku-refreshiwa.
    // =====================================================

    const report =
      await ReportHistory.findOne({
        _id: reportId,

        owner:
          req.ownerId,

        branch:
          req.branchId

      }).lean();


    // =====================================================
    // NOT FOUND
    // =====================================================

    if (!report) {
      return res.status(404).json({
        message:
          "Report not found"
      });
    }


    // =====================================================
    // RESPONSE
    //
    // Tunabaki na structure ya zamani.
    // Hivyo app ya zamani haiharibiki.
    // =====================================================

    return res.status(200).json(
      report
    );


  } catch (error) {

    console.log(
      "REPORT DETAILS ERROR:",
      error
    );


    return res.status(500).json({
      message:
        error.message
    });

  }
};
```


 
 module.exports = {
  getDailyReport,
  getReportHistoryById,
  getReportHistory,
  getWeeklyReport,
  getMonthlyReport,
  getTopProductsReport,
  getCreditReport,
  getExpenseReport,
  getInventoryReport
};
