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
 

const getInventoryReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 🔥 SUMMARY (NO DATE FILTER)
    const summaryAgg = await Product.aggregate([
      {
        $match: {
          user: userId
        }
      },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          stockQty: { $sum: "$stockQty" },
          stockCostValue: {
            $sum: {
              $multiply: ["$stockQty", "$buyPrice"]
            }
          },
          stockSaleValue: {
            $sum: {
              $multiply: ["$stockQty", "$sellPrice"]
            }
          }
        }
      }
    ]);

    const summary = summaryAgg[0] || {
      totalProducts: 0,
      stockQty: 0,
      stockCostValue: 0,
      stockSaleValue: 0
    };

    const expectedProfit =
      summary.stockSaleValue - summary.stockCostValue;

    // 🔥 LOW STOCK (FIXED)
    const lowStock = await Product.find({
      user: userId,
      isActive: true,
      stockQty: { $gt: 0 },
      $expr: {
        $lte: ["$stockQty", "$lowStockAlert"]
      }
    }).select("name stockQty lowStockAlert");

    // 🔥 OUT OF STOCK
    const outOfStock = await Product.find({
      user: userId,
      isActive: true,
      stockQty: { $lte: 0 }
    }).select("name stockQty");

    // 🔥 TOP VALUE PRODUCTS
    const topValue = await Product.find({
      user: userId,
      isActive: true
    })
      .select("name stockQty sellPrice")
      .sort({ stockQty: -1, sellPrice: -1 })
      .limit(10);

    res.status(200).json({
      summary: {
        totalProducts: summary.totalProducts,
        stockQty: summary.stockQty,
        stockCostValue: summary.stockCostValue,
        stockSaleValue: summary.stockSaleValue,
        expectedProfit
      },
      alerts: {
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length
      },
      lowStock,
      outOfStock,
      topValue
    });

  } catch (error) {
    console.log("INVENTORY ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};

const getDailyReport = async (req, res) => {
  try {
    // 🔥 USE UTC (important for consistency)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // =====================
    // SALES
    // =====================
    const salesAgg = await Sale.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$totalProfit" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSales = salesAgg[0]?.totalSales || 0;
    const totalSalesProfit = salesAgg[0]?.totalProfit || 0;
    const salesCount = salesAgg[0]?.count || 0;

    // =====================
    // PURCHASES (ORDERS)
    // =====================
    const ordersAgg = await Order.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalBuy: { $sum: "$buyTotal" },
          totalSellValue: { $sum: "$sellTotal" },
          totalOrderProfit: { $sum: "$totalProfit" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBuy = ordersAgg[0]?.totalBuy || 0;
    const totalSellValue = ordersAgg[0]?.totalSellValue || 0;
    const totalOrderProfit = ordersAgg[0]?.totalOrderProfit || 0;
    const orderCount = ordersAgg[0]?.count || 0;

    // =====================
    // CASH
    // =====================
    const cashAgg = await CashEntry.aggregate([
      {
        $match: {
          user: userId,
          status: "active",
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let cashIncome = 0;
    let totalExpense = 0;

    cashAgg.forEach(c => {
      if (c._id === "income") cashIncome = c.total;
      if (c._id === "expense") totalExpense = c.total;
    });

    // =====================
    // CREDIT (LOANS)
    // =====================
    const loanAgg = await DebtLoan.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: today, $lt: tomorrow }
        }
      },
      {
        $group: {
          _id: null,
          totalIssued: { $sum: "$principalAmount" }
        }
      }
    ]);

    const loansIssued = loanAgg[0]?.totalIssued || 0;

    // =====================
    // PAYMENTS (IMPORTANT FIX)
    // =====================
    const paymentAgg = await DebtPayment.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: today, $lt: tomorrow } // 🔥 muhimu (ulikuwa umeikosa)
        }
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" }
        }
      }
    ]);

    const debtCollected = paymentAgg[0]?.totalCollected || 0;

    // =====================
    // OVERDUE (ALL TIME - OK)
    // =====================
    const overdueCount = await DebtLoan.countDocuments({
      user: userId,
      status: "overdue"
    });

    // =====================
    // CALCULATIONS
    // =====================
    const netPosition =
      totalSales +
      cashIncome +
      debtCollected -
      totalExpense -
      totalBuy;

    const totalBusinessProfit =
      totalSalesProfit +
      totalOrderProfit;

    const netProfit =
      totalBusinessProfit -
      totalExpense;

    const profitMargin =
      totalBusinessProfit > 0
        ? (netProfit / totalBusinessProfit) * 100
        : 0;

    const profitStatus =
      netProfit >= 0
        ? "BIASHARA INA FAIDA"
        : "BIASHARA INA HASARA";

    // =====================
    // RESPONSE
    // =====================
    res.status(200).json({
      date: today,

      sales: {
        totalSales,
        totalSalesProfit,
        count: salesCount
      },

      purchases: {
        totalBuy,
        totalSellValue,
        totalOrderProfit,
        count: orderCount
      },

      cash: {
        cashIncome,
        totalExpense
      },

      credit: {
        loansIssued,
        debtCollected,
        overdueCount
      },

      summary: {
        netCashFlow: netPosition,
        totalBusinessProfit,
        netProfit,
        profitMargin,
        profitStatus
      }
    });

  } catch (error) {
    console.log("DAILY REPORT ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};

const getMonthlyReport = async (req, res) => {
  try {
    const now = new Date();

    // 🔥 USE UTC (important)
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // =====================
    // SALES
    // =====================
    const salesAgg = await Sale.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$totalProfit" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSales = salesAgg[0]?.totalSales || 0;
    const totalProfit = salesAgg[0]?.totalProfit || 0;
    const salesCount = salesAgg[0]?.count || 0;

    // =====================
    // PURCHASES
    // =====================
    const ordersAgg = await Order.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalBuy: { $sum: "$buyTotal" },
          totalSellValue: { $sum: "$sellTotal" },
          totalOrderProfit: { $sum: "$totalProfit" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBuy = ordersAgg[0]?.totalBuy || 0;
    const totalSellValue = ordersAgg[0]?.totalSellValue || 0;
    const totalOrderProfit = ordersAgg[0]?.totalOrderProfit || 0;
    const orderCount = ordersAgg[0]?.count || 0;

    // =====================
    // CASH
    // =====================
    const cashAgg = await CashEntry.aggregate([
      {
        $match: {
          user: userId,
          status: "active",
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let income = 0;
    let totalExpense = 0;

    cashAgg.forEach(c => {
      if (c._id === "income") income = c.total;
      if (c._id === "expense") totalExpense = c.total;
    });

    // =====================
    // CREDIT (LOANS)
    // =====================
    const loanAgg = await DebtLoan.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalIssued: { $sum: "$principalAmount" }
        }
      }
    ]);

    const loansIssued = loanAgg[0]?.totalIssued || 0;

    // =====================
    // PAYMENTS
    // =====================
    const paymentAgg = await DebtPayment.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" }
        }
      }
    ]);

    const collected = paymentAgg[0]?.totalCollected || 0;

    // =====================
    // OVERDUE (ALL TIME)
    // =====================
    const overdueCount = await DebtLoan.countDocuments({
      user: userId,
      status: "overdue"
    });

    // =====================
    // CALCULATIONS
    // =====================
    const netPosition =
      totalSales +
      income +
      collected -
      totalExpense -
      totalBuy;

    const totalBusinessProfit =
      totalProfit +
      totalOrderProfit;

    const netProfit =
      totalBusinessProfit -
      totalExpense;

    const profitMargin =
      totalBusinessProfit > 0
        ? (netProfit / totalBusinessProfit) * 100
        : 0;

    const profitStatus =
      netProfit >= 0
        ? "BIASHARA INA FAIDA"
        : "BIASHARA INA HASARA";

    // =====================
    // RESPONSE
    // =====================
    res.status(200).json({
      month: now.getUTCMonth() + 1,
      year: now.getUTCFullYear(),

      sales: {
        totalSales,
        totalProfit,
        count: salesCount
      },

      purchases: {
        totalBuy,
        totalSellValue,
        totalOrderProfit,
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
    });

  } catch (error) {
    console.log("MONTHLY REPORT ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};

 
const getWeeklyReport = async (req, res) => {
  try {
    const now = new Date();

    // 🔥 GET CURRENT WEEK (MONDAY → SUNDAY) IN UTC
    const day = now.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;

    const start = new Date(now);
    start.setUTCDate(now.getUTCDate() - diff);
    start.setUTCHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setUTCDate(start.getUTCDate() + 7);

    const userId = new mongoose.Types.ObjectId(req.user.id);

    // =====================
    // SALES
    // =====================
    const salesAgg = await Sale.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$totalProfit" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalSales = salesAgg[0]?.totalSales || 0;
    const totalProfit = salesAgg[0]?.totalProfit || 0;
    const salesCount = salesAgg[0]?.count || 0;

    // =====================
    // PURCHASES
    // =====================
    const ordersAgg = await Order.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalBuy: { $sum: "$buyTotal" },
          totalSellValue: { $sum: "$sellTotal" },
          totalOrderProfit: { $sum: "$totalProfit" },
          count: { $sum: 1 }
        }
      }
    ]);

    const totalBuy = ordersAgg[0]?.totalBuy || 0;
    const totalSellValue = ordersAgg[0]?.totalSellValue || 0;
    const totalOrderProfit = ordersAgg[0]?.totalOrderProfit || 0;
    const orderCount = ordersAgg[0]?.count || 0;

    // =====================
    // CASH
    // =====================
    const cashAgg = await CashEntry.aggregate([
      {
        $match: {
          user: userId,
          status: "active",
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" }
        }
      }
    ]);

    let income = 0;
    let totalExpense = 0;

    cashAgg.forEach(c => {
      if (c._id === "income") income = c.total;
      if (c._id === "expense") totalExpense = c.total;
    });

    // =====================
    // CREDIT (LOANS)
    // =====================
    const loanAgg = await DebtLoan.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalIssued: { $sum: "$principalAmount" }
        }
      }
    ]);

    const loansIssued = loanAgg[0]?.totalIssued || 0;

    // =====================
    // PAYMENTS
    // =====================
    const paymentAgg = await DebtPayment.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end }
        }
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" }
        }
      }
    ]);

    const collected = paymentAgg[0]?.totalCollected || 0;

    // =====================
    // OVERDUE (ALL TIME)
    // =====================
    const overdueCount = await DebtLoan.countDocuments({
      user: userId,
      status: "overdue"
    });

    // =====================
    // CALCULATIONS
    // =====================
    const netPosition =
      totalSales +
      income +
      collected -
      totalExpense -
      totalBuy;

    const totalBusinessProfit =
      totalProfit +
      totalOrderProfit;

    const netProfit =
      totalBusinessProfit -
      totalExpense;

    const profitMargin =
      totalBusinessProfit > 0
        ? (netProfit / totalBusinessProfit) * 100
        : 0;

    const profitStatus =
      netProfit >= 0
        ? "BIASHARA INA FAIDA"
        : "BIASHARA INA HASARA";

    // =====================
    // RESPONSE
    // =====================
    res.status(200).json({
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
    });

  } catch (error) {
    console.log("WEEKLY REPORT ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};

const getTopProductsReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 🔥 DEFAULT RANGE = THIS MONTH (UNAWEZA BADILI BAADAE)
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const result = await Sale.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end } // 🔥 muhimu (ondoa kama unataka ALL TIME)
        }
      },

      // 🔥 BREAK ITEMS ARRAY
      { $unwind: "$items" },

      {
        $group: {
          _id: "$items.name",

          name: { $first: "$items.name" },

          qty: {
            $sum: {
              $ifNull: ["$items.qty", 0]
            }
          },

          revenue: {
            $sum: {
              $ifNull: ["$items.total", 0]
            }
          },

          profit: {
            $sum: {
              $multiply: [
                {
                  $subtract: [
                    { $ifNull: ["$items.price", 0] },
                    { $ifNull: ["$items.buyPrice", 0] }
                  ]
                },
                { $ifNull: ["$items.qty", 0] }
              ]
            }
          },

          count: { $sum: 1 }
        }
      },

      // 🔥 SORT (BEST SELLERS FIRST)
      {
        $sort: {
          qty: -1,
          revenue: -1
        }
      },

      // 🔥 LIMIT
      { $limit: 20 }
    ]);

    res.status(200).json(result);

  } catch (error) {
    console.log("TOP PRODUCTS ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};


 

const getCreditReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 🔥 DEFAULT RANGE = THIS MONTH (unaweza badili)
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // =====================
    // LOANS
    // =====================
    const loanAgg = await DebtLoan.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end } // 🔥 muhimu
        }
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalIssued: { $sum: "$principalAmount" },
          outstanding: { $sum: "$balanceAmount" }
        }
      }
    ]);

    // =====================
    // PAYMENTS
    // =====================
    const paymentAgg = await DebtPayment.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: start, $lt: end } // 🔥 muhimu
        }
      },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" }
        }
      }
    ]);

    // =====================
    // PROCESS RESULTS
    // =====================
    let overdueCount = 0;
    let activeCount = 0;
    let paidCount = 0;

    let totalLoans = 0;
    let totalIssued = 0;
    let outstanding = 0;

    loanAgg.forEach(l => {
      totalLoans += l.count || 0;
      totalIssued += l.totalIssued || 0;
      outstanding += l.outstanding || 0;

      if (l._id === "overdue") overdueCount = l.count;
      if (l._id === "active") activeCount = l.count;
      if (l._id === "paid") paidCount = l.count;
    });

    const totalCollected = paymentAgg[0]?.totalCollected || 0;

    // =====================
    // OPTIONAL: RISKY CUSTOMERS
    // =====================
    const riskyCustomers = await DebtLoan.find({
      user: userId,
      status: "overdue"
    })
      .sort({ balanceAmount: -1 })
      .limit(5)
      .populate("customer", "fullName phone riskScore");

    // =====================
    // RESPONSE
    // =====================
    res.status(200).json({
      summary: {
        totalLoans,
        totalIssued,
        totalCollected,
        outstanding,
        overdueCount,
        activeCount,
        paidCount
      },
      riskyCustomers
    });

  } catch (error) {
    console.log("CREDIT REPORT ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};

const getExpenseReport = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    // 🔥 DEFAULT RANGE = THIS MONTH (consistent na reports zako)
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    // =====================
    // CATEGORY AGGREGATION
    // =====================
    const expenseAgg = await CashEntry.aggregate([
      {
        $match: {
          user: userId,
          status: "active",
          type: "expense",
          createdAt: { $gte: start, $lt: end } // 🔥 muhimu
        }
      },
      {
        $group: {
          _id: "$category",
          category: { $first: "$category" },
          amount: { $sum: "$amount" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { amount: -1 }
      }
    ]);

    // =====================
    // TOTAL
    // =====================
    const totalExpense = expenseAgg.reduce(
      (sum, x) => sum + (x.amount || 0),
      0
    );

    // =====================
    // TOP 3
    // =====================
    const top3 = expenseAgg.slice(0, 3);

    // =====================
    // RECENT EXPENSES (NEW)
    // =====================
    const recent = await CashEntry.find({
      user: userId,
      status: "active",
      type: "expense",
      createdAt: { $gte: start, $lt: end }
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("category amount createdAt");

    // =====================
    // RESPONSE
    // =====================
    res.status(200).json({
      summary: {
        totalExpense,
        entries: recent.length
      },
      categories: expenseAgg,
      top3,
      recent
    });

  } catch (error) {
    console.log("EXPENSE REPORT ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};
 module.exports = {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getTopProductsReport,
  getCreditReport,
  getExpenseReport,
  getInventoryReport
};
