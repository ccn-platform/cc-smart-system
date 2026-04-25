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

const getInventoryReport =
async (req, res) => {
  try {
    const userId =
      req.user.id;

    const rows =
      await Product.find({
        user: userId,
        isActive: true
      });

    const totalProducts =
      rows.length;

    const stockQty =
      rows.reduce(
        (sum, x) =>
          sum +
          (x.stockQty || 0),
        0
      );

    const stockCostValue =
      rows.reduce(
        (sum, x) =>
          sum +
          (
            (x.stockQty || 0) *
            (x.buyPrice || 0)
          ),
        0
      );

    const stockSaleValue =
      rows.reduce(
        (sum, x) =>
          sum +
          (
            (x.stockQty || 0) *
            (x.sellPrice || 0)
          ),
        0
      );

    const expectedProfit =
      stockSaleValue -
      stockCostValue;

    const lowStock =
      rows.filter(
        x =>
          (x.stockQty || 0) <=
          (x.lowStockAlert || 0) &&
          (x.stockQty || 0) > 0
      );

    const outOfStock =
      rows.filter(
        x =>
          (x.stockQty || 0) <= 0
      );

    const topValue =
      [...rows]
        .sort(
          (a, b) =>
            (
              (b.stockQty || 0) *
              (b.sellPrice || 0)
            ) -
            (
              (a.stockQty || 0) *
              (a.sellPrice || 0)
            )
        )
        .slice(0, 10);

    res.status(200).json({
      summary: {
        totalProducts,
        stockQty,
        stockCostValue,
        stockSaleValue,
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
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

// DAILY MASTER REPORT
const getDailyReport =
async (req, res) => {
  try {
    const today =
      new Date();

    today.setHours(
      0, 0, 0, 0
    );

    const tomorrow =
      new Date(today);

    tomorrow.setDate(
      tomorrow.getDate() + 1
    );

    const userId =
      req.user.id;

    // SALES
    const sales =
      await Sale.find({
        user: userId,
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });

    const totalSales =
      sales.reduce(
        (sum, x) =>
          sum +
          (x.totalAmount || 0),
        0
      );

    const totalSalesProfit =
      sales.reduce(
        (sum, x) =>
          sum +
          (x.totalProfit || 0),
        0
      );

    // PURCHASES
    const orders =
      await Order.find({
        user: userId,
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });

    const totalBuy =
      orders.reduce(
        (sum, x) =>
          sum +
          (x.buyTotal || 0),
        0
      );

    const totalSellValue =
      orders.reduce(
        (sum, x) =>
          sum +
          (x.sellTotal || 0),
        0
      );

    const totalOrderProfit =
      orders.reduce(
        (sum, x) =>
          sum +
          (x.totalProfit || 0),
        0
      );

    // CASH
    const cash =
      await CashEntry.find({
        user: userId,
        status:
          "active",
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });

    const cashIncome =
      cash
        .filter(
          x =>
            x.type ===
            "income"
        )
        .reduce(
          (sum, x) =>
            sum +
            x.amount,
          0
        );

    const cashExpense =
      cash
        .filter(
          x =>
            x.type ===
            "expense"
        )
        .reduce(
          (sum, x) =>
            sum +
            x.amount,
          0
        );

    // CREDIT LOANS
    const loans =
      await DebtLoan.find({
        user: userId,
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });

    const loansIssued =
      loans.reduce(
        (sum, x) =>
          sum +
          x.principalAmount,
        0
      );

    // PAYMENTS
    const payments =
      await DebtPayment.find({
        user: userId,
        createdAt: {
          $gte: today,
          $lt: tomorrow
        }
      });

    const debtCollected =
      payments.reduce(
        (sum, x) =>
          sum +
          x.amount,
        0
      );

    // OVERDUE
    const overdueCount =
      await DebtLoan.countDocuments({
        user: userId,
        status:
          "overdue"
      });

    // NET POSITION
    const netPosition =
      totalSales +
      cashIncome +
      debtCollected -
      cashExpense -
      totalBuy;

    res.status(200).json({
      date: today,

      sales: {
        totalSales,
        totalSalesProfit,
        count:
          sales.length
      },

      purchases: {
        totalBuy,
        totalSellValue,
        totalOrderProfit,
        count:
          orders.length
      },

      cash: {
        cashIncome,
        cashExpense
      },

      credit: {
        loansIssued,
        debtCollected,
        overdueCount
      },

      summary: {
        netPosition
      }
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};
const getMonthlyReport =
async (req, res) => {
  try {
    const now =
      new Date();

    const start =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

    const end =
      new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      );

    const userId =
      req.user.id;

    // SALES
    const sales =
      await Sale.find({
        user: userId,
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const totalSales =
      sales.reduce(
        (sum, x) =>
          sum +
          (x.totalAmount || 0),
        0
      );

    const totalProfit =
      sales.reduce(
        (sum, x) =>
          sum +
          (x.totalProfit || 0),
        0
      );

    // PURCHASES
    const orders =
      await Order.find({
        user: userId,
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const totalBuy =
      orders.reduce(
        (sum, x) =>
          sum +
          (x.buyTotal || 0),
        0
      );

    // CASH
    const cash =
      await CashEntry.find({
        user: userId,
        status:
          "active",
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const income =
      cash
        .filter(
          x =>
            x.type ===
            "income"
        )
        .reduce(
          (sum, x) =>
            sum +
            x.amount,
          0
        );

    const expense =
      cash
        .filter(
          x =>
            x.type ===
            "expense"
        )
        .reduce(
          (sum, x) =>
            sum +
            x.amount,
          0
        );

    // LOANS
    const loans =
      await DebtLoan.find({
        user: userId,
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const loansIssued =
      loans.reduce(
        (sum, x) =>
          sum +
          x.principalAmount,
        0
      );

    // PAYMENTS
    const payments =
      await DebtPayment.find({
        user: userId,
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const collected =
      payments.reduce(
        (sum, x) =>
          sum +
          x.amount,
        0
      );

    // OVERDUE
    const overdueCount =
      await DebtLoan.countDocuments({
        user: userId,
        status:
          "overdue"
      });

    const netPosition =
      totalSales +
      income +
      collected -
      expense -
      totalBuy;

    res.status(200).json({
      month:
        now.getMonth() + 1,
      year:
        now.getFullYear(),

      sales: {
        totalSales,
        totalProfit,
        count:
          sales.length
      },

      purchases: {
        totalBuy,
        count:
          orders.length
      },

      cash: {
        income,
        expense
      },

      credit: {
        loansIssued,
        collected,
        overdueCount
      },

      summary: {
        netPosition
      }
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

const getWeeklyReport =
async (req, res) => {
  try {
    const now =
      new Date();

    const day =
      now.getDay();

    const diff =
      day === 0
        ? 6
        : day - 1;

    const start =
      new Date(now);

    start.setDate(
      now.getDate() - diff
    );

    start.setHours(
      0, 0, 0, 0
    );

    const end =
      new Date(start);

    end.setDate(
      start.getDate() + 7
    );

    const userId =
      req.user.id;

    const sales =
      await Sale.find({
        user: userId,
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const totalSales =
      sales.reduce(
        (sum, x) =>
          sum +
          (x.totalAmount || 0),
        0
      );

    const totalProfit =
      sales.reduce(
        (sum, x) =>
          sum +
          (x.totalProfit || 0),
        0
      );

    const orders =
      await Order.find({
        user: userId,
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const totalBuy =
      orders.reduce(
        (sum, x) =>
          sum +
          (x.buyTotal || 0),
        0
      );

    const cash =
      await CashEntry.find({
        user: userId,
        status:
          "active",
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const income =
      cash
        .filter(
          x =>
            x.type ===
            "income"
        )
        .reduce(
          (sum, x) =>
            sum +
            x.amount,
          0
        );

    const expense =
      cash
        .filter(
          x =>
            x.type ===
            "expense"
        )
        .reduce(
          (sum, x) =>
            sum +
            x.amount,
          0
        );

    const loans =
      await DebtLoan.find({
        user: userId,
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const loansIssued =
      loans.reduce(
        (sum, x) =>
          sum +
          x.principalAmount,
        0
      );

    const payments =
      await DebtPayment.find({
        user: userId,
        createdAt: {
          $gte: start,
          $lt: end
        }
      });

    const collected =
      payments.reduce(
        (sum, x) =>
          sum +
          x.amount,
        0
      );

    const overdueCount =
      await DebtLoan.countDocuments({
        user: userId,
        status:
          "overdue"
      });

    const netPosition =
      totalSales +
      income +
      collected -
      expense -
      totalBuy;

    res.status(200).json({
      startDate: start,
      endDate: end,

      sales: {
        totalSales,
        totalProfit,
        count:
          sales.length
      },

      purchases: {
        totalBuy,
        count:
          orders.length
      },

      cash: {
        income,
        expense
      },

      credit: {
        loansIssued,
        collected,
        overdueCount
      },

      summary: {
        netPosition
      }
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
}; 

const getTopProductsReport =
async (req, res) => {
  try {
    const userId =
      req.user.id;

    const sales =
      await Sale.find({
        user: userId
      });

    const map = {};

    for (const sale of sales) {
      for (const item of sale.items) {
        const key =
          item.name ||
          "Unknown";

        if (!map[key]) {
          map[key] = {
            name: key,
            qty: 0,
            revenue: 0,
            profit: 0,
            count: 0
          };
        }

        map[key].qty +=
          item.qty || 0;

        map[key].revenue +=
          item.total || 0;

        map[key].profit +=
          (
            (item.price || 0) -
            (item.buyPrice || 0)
          ) *
          (item.qty || 0);

        map[key].count += 1;
      }
    }

    const result =
      Object.values(map)
        .sort(
          (a, b) =>
            b.qty - a.qty
        )
        .slice(0, 20);

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

const getCreditReport =
async (req, res) => {
  try {
    const userId =
      req.user.id;

    const loans =
      await DebtLoan.find({
        user: userId
      }).populate(
        "customer",
        "fullName phone riskScore"
      );

    const payments =
      await DebtPayment.find({
        user: userId
      });

    const totalIssued =
      loans.reduce(
        (sum, x) =>
          sum +
          x.principalAmount,
        0
      );

    const totalCollected =
      payments.reduce(
        (sum, x) =>
          sum + x.amount,
        0
      );

    const outstanding =
      loans.reduce(
        (sum, x) =>
          sum +
          x.balanceAmount,
        0
      );

    const overdue =
      loans.filter(
        x =>
          x.status ===
          "overdue"
      );

    const active =
      loans.filter(
        x =>
          x.status ===
          "active"
      );

    const paid =
      loans.filter(
        x =>
          x.status ===
          "paid"
      );

    const risky =
      loans
        .filter(
          x =>
            x.customer
              ?.riskScore <
            40
        )
        .slice(0, 10);

    res.status(200).json({
      summary: {
        totalLoans:
          loans.length,
        totalIssued,
        totalCollected,
        outstanding,
        overdueCount:
          overdue.length,
        activeCount:
          active.length,
        paidCount:
          paid.length
      },
      riskyCustomers:
        risky
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

const getExpenseReport =
async (req, res) => {
  try {
    const userId =
      req.user.id;

    const rows =
      await CashEntry.find({
        user: userId,
        status:
          "active",
        type:
          "expense"
      }).sort({
        createdAt: -1
      });

    const totalExpense =
      rows.reduce(
        (sum, x) =>
          sum +
          x.amount,
        0
      );

    const map = {};

    for (const row of rows) {
      const key =
        row.category ||
        "Other";

      if (!map[key]) {
        map[key] = {
          category: key,
          amount: 0,
          count: 0
        };
      }

      map[key].amount +=
        row.amount || 0;

      map[key].count += 1;
    }

    const categories =
      Object.values(map)
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        );

    const top3 =
      categories.slice(
        0,
        3
      );

    res.status(200).json({
      summary: {
        totalExpense,
        entries:
          rows.length
      },
      categories,
      top3,
      recent:
        rows.slice(0, 10)
    });
  } catch (error) {
    res.status(500).json({
      message:
        error.message
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