 const mongoose =
  require("mongoose");

const Sale =
  require("../models/Sale");

const Product =
  require("../models/Product");

const CashEntry =
  require("../models/CashEntry");

const DebtLoan =
  require("../models/DebtLoan");

const DebtPayment =
  require("../models/DebtPayment");

const Order =
  require("../models/Order");

const Audit =
  require("../models/Audit");

const CustomerIdentity =
  require("../models/CustomerIdentity");

const Shop =
  require("../models/Shop");

const User =
  require("../models/User");

const Branch =
  require("../models/Branch");

const {
  externalWebSearch
} = require(
  "../services/externalSearchService"
);

const getBusinessTools =
  () => {
    return [
      {
        type: "function",
        function: {
          name:
            "get_shop_context",
          description:
            "Get business information",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_branch_context",
          description:
            "Get current branch info",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_daily_report",
          description:
            "Get today's business report",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_inventory_report",
          description:
            "Get inventory health",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_top_products",
          description:
            "Get top selling products",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_credit_report",
          description:
            "Get debt and payment performance report",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_customer_summary",
          description:
            "Get customer summary",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_risky_customers",
          description:
            "Get risky customers",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_expense_report",
          description:
            "Get expense report",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_last_audit",
          description:
            "Get latest audit",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_order_analysis",
          description:
            "Get supplier order analysis",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "get_staff_summary",
          description:
            "Get staff summary",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },

      {
        type: "function",
        function: {
          name:
            "web_search",
          description:
            "Search current external business intelligence and market information",
          parameters: {
            type: "object",
            properties: {
              query: {
                type:
                  "string"
              }
            },
            required: [
              "query"
            ]
          }
        }
      }
    ];
  };

const executeBusinessTool =
  async (
    toolName,
    {
      ownerId,
      branchId,
      args = {}
    }
  ) => {
    const owner =
      new mongoose.Types.ObjectId(
        ownerId
      );

    const branch =
      new mongoose.Types.ObjectId(
        branchId
      );

    switch (
      toolName
    ) {
      case "get_shop_context":
        return await Shop.findOne({
          owner
        })
          .select(
            "businessName currency taxPercent category mkoa wilaya"
          )
          .lean();

      case "get_branch_context":
        return await Branch.findById(
          branch
        )
          .select(
            "name isMain isActive subscription"
          )
          .lean();

      case "get_daily_report":
        {
          const start =
            new Date();

          start.setHours(
            0,
            0,
            0,
            0
          );

          const sales =
            await Sale.aggregate([
              {
                $match: {
                  owner,
                  branch,
                  createdAt: {
                    $gte:
                      start
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  totalSales:
                    {
                      $sum:
                        "$totalAmount"
                    },
                  totalProfit:
                    {
                      $sum:
                        "$totalProfit"
                    },
                  count: {
                    $sum: 1
                  }
                }
              }
            ]);

          return (
            sales[0] || {
              totalSales: 0,
              totalProfit: 0,
              count: 0
            }
          );
        }

      case "get_inventory_report":
        {
          const products =
            await Product.find({
              owner,
              branch,
              isActive:
                true
            }).lean();

          return {
            totalProducts:
              products.length,

            lowStock:
              products.filter(
                (p) =>
                  p.stockQty <=
                    p.lowStockAlert &&
                  p.stockQty > 0
              ),

            outOfStock:
              products.filter(
                (p) =>
                  p.stockQty <=
                  0
              )
          };
        }

      case "get_top_products":
        return await Sale.aggregate([
          {
            $match: {
              owner,
              branch
            }
          },
          {
            $unwind:
              "$items"
          },
          {
            $group: {
              _id:
                "$items.name",
              qty: {
                $sum:
                  "$items.qty"
              },
              revenue:
                {
                  $sum:
                    "$items.total"
                }
            }
          },
          {
            $sort: {
              qty: -1
            }
          },
          {
            $limit: 10
          }
        ]);

      case "get_credit_report":
        {
          const activeLoans =
            await DebtLoan.countDocuments(
              {
                owner,
                branch,
                status:
                  "active"
              }
            );

          const overdueLoans =
            await DebtLoan.countDocuments(
              {
                owner,
                branch,
                status:
                  "overdue"
              }
            );

          const totalCollected =
            await DebtPayment.aggregate([
              {
                $match: {
                  owner,
                  branch,
                  status:
                    "posted"
                }
              },
              {
                $group: {
                  _id: null,
                  total: {
                    $sum:
                      "$amount"
                  }
                }
              }
            ]);

          return {
            activeLoans,
            overdueLoans,
            totalCollected:
              totalCollected[0]
                ?.total || 0
          };
        }

      case "get_customer_summary":
        {
          const total =
            await CustomerIdentity.countDocuments(
              {
                owner
              }
            );

          const blacklisted =
            await CustomerIdentity.countDocuments(
              {
                owner,
                status:
                  "blacklisted"
              }
            );

          return {
            totalCustomers:
              total,
            blacklisted
          };
        }

      case "get_risky_customers":
        return await CustomerIdentity.find(
          {
            owner,
            riskScore: {
              $lt: 400
            }
          }
        )
          .select(
            "fullName phone riskScore overdueLoans"
          )
          .limit(10)
          .lean();

      case "get_expense_report":
        return await CashEntry.aggregate([
          {
            $match: {
              owner,
              branch,
              type:
                "expense",
              status:
                "active"
            }
          },
          {
            $group: {
              _id:
                "$category",
              total: {
                $sum:
                  "$amount"
              }
            }
          },
          {
            $sort: {
              total: -1
            }
          }
        ]);

      case "get_last_audit":
        return await Audit.findOne({
          owner,
          branch
        })
          .sort({
            createdAt: -1
          })
          .lean();

      case "get_order_analysis":
        return await Order.find({
          owner,
          branch
        })
          .sort({
            createdAt: -1
          })
          .limit(10)
          .lean();

      case "get_staff_summary":
        return await User.find({
          owner,
          role:
            "staff"
        })
          .select(
            "name phone branch"
          )
          .lean();

      case "web_search":
        return await externalWebSearch(
          args.query
        );

      default:
        throw new Error(
          "Unknown tool"
        );
    }
  };

module.exports = {
  getBusinessTools,
  executeBusinessTool
};
