// controllers/microfinanceDashboardController.js

const DebtLoan = require("../models/DebtLoan");
const DebtPayment = require("../models/DebtPayment");
const LoanApplication = require("../models/loanApplication");
const LoanApproval = require("../models/loanApproval");
const LoanSecurity = require("../models/loanSecurity");

// Dashboard ya kusoma takwimu pekee.
// Inahitaji protect na branchAccess ziwe zimekimbia kabla ya controller.

const getMicrofinanceDashboard = async (req, res) => {
  try {
    const { ownerId, branchId } = req;

    if (!ownerId || !branchId) {
      return res.status(400).json({
        message: "Owner au branch haijapatikana.",
      });
    }

    // Tumia UTC ili mipaka ya siku/mwezi iwe thabiti kwenye server.
    const now = new Date();

    const todayStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

    const tomorrowStart = new Date(
      todayStart.getTime() + 24 * 60 * 60 * 1000
    );

    const monthStart = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
    );

    const scope = {
      owner: ownerId,
      branch: branchId,
    };

    const activeLoanStatuses = [
      "active",
      "overdue",
      "defaulted",
    ];

    const [
      loanSummaryRows,
      paymentSummaryRows,
      applicationSummaryRows,
      securitySummaryRows,
      recentPayments,
      latestApprovals,
    ] = await Promise.all([
      // Muhtasari wa mikopo. Rekodi zilizofutwa hazihesabiwi.
      DebtLoan.aggregate([
        {
          $match: {
            ...scope,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,

            totalLoans: { $sum: 1 },

            pendingApprovalLoans: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "pending_approval"] },
                  1,
                  0,
                ],
              },
            },

            activeLoans: {
              $sum: {
                $cond: [{ $eq: ["$status", "active"] }, 1, 0],
              },
            },

            overdueLoans: {
              $sum: {
                $cond: [{ $eq: ["$status", "overdue"] }, 1, 0],
              },
            },

            defaultedLoans: {
              $sum: {
                $cond: [{ $eq: ["$status", "defaulted"] }, 1, 0],
              },
            },

            paidLoans: {
              $sum: {
                $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
              },
            },

            cancelledLoans: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
              },
            },

            totalPrincipal: { $sum: "$principalAmount" },

            outstandingBalance: {
              $sum: {
                $cond: [
                  { $in: ["$status", activeLoanStatuses] },
                  "$balanceAmount",
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Malipo yaliyo-post tu. Refund huhesabiwa tofauti.
      DebtPayment.aggregate([
        {
          $match: {
            ...scope,
            status: "posted",
          },
        },
        {
          $group: {
            _id: null,

            postedPaymentCount: {
              $sum: {
                $cond: [{ $eq: ["$type", "payment"] }, 1, 0],
              },
            },

            postedPaymentAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "payment"] },
                  "$amount",
                  0,
                ],
              },
            },

            postedRefundCount: {
              $sum: {
                $cond: [{ $eq: ["$type", "refund"] }, 1, 0],
              },
            },

            postedRefundAmount: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "refund"] },
                  "$amount",
                  0,
                ],
              },
            },

            todayPayments: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$type", "payment"] },
                      { $gte: ["$paymentDate", todayStart] },
                      { $lt: ["$paymentDate", tomorrowStart] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },

            monthPayments: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$type", "payment"] },
                      { $gte: ["$paymentDate", monthStart] },
                      { $lte: ["$paymentDate", now] },
                    ],
                  },
                  "$amount",
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Maombi yenye branch iliyochaguliwa pekee.
      LoanApplication.aggregate([
        {
          $match: {
            ...scope,
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalApplications: { $sum: 1 },

            draft: {
              $sum: {
                $cond: [{ $eq: ["$status", "draft"] }, 1, 0],
              },
            },

            submitted: {
              $sum: {
                $cond: [{ $eq: ["$status", "submitted"] }, 1, 0],
              },
            },

            underReview: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "under_review"] },
                  1,
                  0,
                ],
              },
            },

            approved: {
              $sum: {
                $cond: [{ $eq: ["$status", "approved"] }, 1, 0],
              },
            },

            rejected: {
              $sum: {
                $cond: [{ $eq: ["$status", "rejected"] }, 1, 0],
              },
            },

            converted: {
              $sum: {
                $cond: [{ $eq: ["$status", "converted"] }, 1, 0],
              },
            },

            cancelled: {
              $sum: {
                $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Dhamana/wadhamini haiwezi kuhusishwa na branch nyingine.
      LoanSecurity.aggregate([
        {
          $match: {
            ...scope,
            status: "active",
            deletedAt: null,
          },
        },
        {
          $group: {
            _id: null,
            totalActiveSecurity: { $sum: 1 },

            guarantors: {
              $sum: {
                $cond: [{ $eq: ["$type", "guarantor"] }, 1, 0],
              },
            },

            collaterals: {
              $sum: {
                $cond: [{ $eq: ["$type", "collateral"] }, 1, 0],
              },
            },

            collateralEstimatedValue: {
              $sum: {
                $cond: [
                  { $eq: ["$type", "collateral"] },
                  { $ifNull: ["$collateral.estimatedValue", 0] },
                  0,
                ],
              },
            },
          },
        },
      ]),

      // Malipo ya karibuni; posted pekee.
      DebtPayment.find({
        ...scope,
        status: "posted",
      })
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(10)
        .select(
          "loan customer amount paymentDate type paymentMethod channel reference transactionId"
        )
        .populate("customer", "name fullName phone")
        .populate("loan", "loanNumber")
        .lean(),

      // Maamuzi ya karibuni ya maombi.
      LoanApproval.find(scope)
        .sort({ decidedAt: -1, createdAt: -1 })
        .limit(10)
        .select(
          "applicationId decision approvedAmount approvedTermDays reason decidedBy decidedAt resultingLoanId"
        )
        .populate("applicationId", "customerName customerPhone requestedAmount status")
        .populate("decidedBy", "name fullName")
        .lean(),
    ]);

    const loans = loanSummaryRows[0] || {};
    const payments = paymentSummaryRows[0] || {};
    const applications = applicationSummaryRows[0] || {};
    const securities = securitySummaryRows[0] || {};

    return res.status(200).json({
      success: true,
      branchId: String(branchId),
      generatedAt: now.toISOString(),

      loans: {
        total: loans.totalLoans || 0,
        pendingApproval: loans.pendingApprovalLoans || 0,
        active: loans.activeLoans || 0,
        overdue: loans.overdueLoans || 0,
        defaulted: loans.defaultedLoans || 0,
        paid: loans.paidLoans || 0,
        cancelled: loans.cancelledLoans || 0,
        totalPrincipal: loans.totalPrincipal || 0,
        outstandingBalance: loans.outstandingBalance || 0,
      },

      collections: {
        postedPaymentCount: payments.postedPaymentCount || 0,
        postedPaymentAmount: payments.postedPaymentAmount || 0,
        postedRefundCount: payments.postedRefundCount || 0,
        postedRefundAmount: payments.postedRefundAmount || 0,
        todayPayments: payments.todayPayments || 0,
        monthPayments: payments.monthPayments || 0,
      },

      applications: {
        total: applications.totalApplications || 0,
        draft: applications.draft || 0,
        submitted: applications.submitted || 0,
        underReview: applications.underReview || 0,
        approved: applications.approved || 0,
        rejected: applications.rejected || 0,
        converted: applications.converted || 0,
        cancelled: applications.cancelled || 0,
      },

      securities: {
        activeTotal: securities.totalActiveSecurity || 0,
        guarantors: securities.guarantors || 0,
        collaterals: securities.collaterals || 0,
        collateralEstimatedValue:
          securities.collateralEstimatedValue || 0,
      },

      recentPayments,
      latestApprovals,
    });
  } catch (error) {
    console.error(
      "MICROFINANCE DASHBOARD ERROR:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kupata takwimu za dashboard.",
    });
  }
};

module.exports = {
  getMicrofinanceDashboard,
};
