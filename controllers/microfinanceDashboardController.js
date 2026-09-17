 // controllers/microfinanceDashboardController.js

const DebtLoan = require("../models/DebtLoan");
const DebtPayment = require("../models/DebtPayment");

// Dashboard ya kusoma takwimu pekee.
// Hakuna loan creation wala payment posting hapa.
// Middleware ya protect na branchAccess lazima iwe imekimbia kabla ya controller.

const TIME_ZONE = "Africa/Dar_es_Salaam";
const TANZANIA_UTC_OFFSET_MS = 3 * 60 * 60 * 1000;

const getDatePartsInTanzania = (date) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
};

// Hurejesha mwanzo wa siku ya Tanzania kama Date ya UTC.
// Tanzania hutumia UTC+3 bila kubadilisha saa za majira.
const getTanzaniaDayStart = (date) => {
  const { year, month, day } = getDatePartsInTanzania(date);

  return new Date(
    Date.UTC(year, month - 1, day) - TANZANIA_UTC_OFFSET_MS
  );
};

const getTanzaniaMonthStart = (date) => {
  const { year, month } = getDatePartsInTanzania(date);

  return new Date(
    Date.UTC(year, month - 1, 1) - TANZANIA_UTC_OFFSET_MS
  );
};

const getMicrofinanceDashboard = async (req, res) => {
  try {
    const { ownerId, branchId } = req;

    if (!ownerId || !branchId) {
      return res.status(400).json({
        success: false,
        message: "Owner au branch haijapatikana.",
      });
    }

    const now = new Date();

    const todayStart = getTanzaniaDayStart(now);
    const tomorrowStart = new Date(
      todayStart.getTime() + 24 * 60 * 60 * 1000
    );
    const monthStart = getTanzaniaMonthStart(now);

    const scope = {
      owner: ownerId,
      branch: branchId,
    };

    // Mikopo hii ndiyo inayohesabiwa kuwa imetolewa.
    // Mikopo inayosubiri idhini au iliyoghairiwa haijumuishwi.
    const issuedLoanStatuses = [
      "active",
      "overdue",
      "defaulted",
      "paid",
    ];

    // Salio linalodaiwa sasa huhesabiwa kwa mikopo yenye deni.
    const outstandingLoanStatuses = [
      "active",
      "overdue",
      "defaulted",
    ];

    const [
      loanSummaryRows,
      paymentSummaryRows,
      todayLoanSummaryRows,
      todayPaymentSummaryRows,
      loansIssuedToday,
      paymentsReceivedToday,
    ] = await Promise.all([
      // Takwimu za jumla za mikopo.
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

            totalLoans: {
              $sum: {
                $cond: [
                  { $in: ["$status", issuedLoanStatuses] },
                  1,
                  0,
                ],
              },
            },

            totalPrincipal: {
              $sum: {
                $cond: [
                  { $in: ["$status", issuedLoanStatuses] },
                  "$principalAmount",
                  0,
                ],
              },
            },

            outstandingBalance: {
              $sum: {
                $cond: [
                  { $in: ["$status", outstandingLoanStatuses] },
                  "$balanceAmount",
                  0,
                ],
              },
            },

            active: {
              $sum: {
                $cond: [{ $eq: ["$status", "active"] }, 1, 0],
              },
            },

            overdue: {
              $sum: {
                $cond: [{ $eq: ["$status", "overdue"] }, 1, 0],
              },
            },

            defaulted: {
              $sum: {
                $cond: [{ $eq: ["$status", "defaulted"] }, 1, 0],
              },
            },

            paid: {
              $sum: {
                $cond: [{ $eq: ["$status", "paid"] }, 1, 0],
              },
            },
          },
        },
      ]),

      // Malipo yote yaliyopostiwa.
      // Refund hazijumuishwi kwenye makusanyo.
      DebtPayment.aggregate([
        {
          $match: {
            ...scope,
            status: "posted",
            type: "payment",
          },
        },
        {
          $group: {
            _id: null,
            totalPaymentCount: { $sum: 1 },
            totalPaymentAmount: { $sum: "$amount" },
          },
        },
      ]),

      // Muhtasari wa mikopo iliyotolewa leo.
      DebtLoan.aggregate([
        {
          $match: {
            ...scope,
            deletedAt: null,
            status: { $in: issuedLoanStatuses },
            createdAt: {
              $gte: todayStart,
              $lt: tomorrowStart,
            },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$principalAmount" },
          },
        },
      ]),

      // Muhtasari wa malipo yaliyopokelewa leo.
      DebtPayment.aggregate([
        {
          $match: {
            ...scope,
            status: "posted",
            type: "payment",
            paymentDate: {
              $gte: todayStart,
              $lt: tomorrowStart,
            },
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            amount: { $sum: "$amount" },
          },
        },
      ]),

      // Orodha ya mikopo iliyotolewa leo.
      DebtLoan.find({
        ...scope,
        deletedAt: null,
        status: { $in: issuedLoanStatuses },
        createdAt: {
          $gte: todayStart,
          $lt: tomorrowStart,
        },
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .select(
          "customer loanNumber principalAmount balanceAmount dueDate status createdAt"
        )
        .populate("customer", "name fullName phone")
        .lean(),

      // Orodha ya malipo yaliyopokelewa leo.
      DebtPayment.find({
        ...scope,
        status: "posted",
        type: "payment",
        paymentDate: {
          $gte: todayStart,
          $lt: tomorrowStart,
        },
      })
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(50)
        .select(
          "loan customer amount paymentDate paymentMethod channel reference transactionId"
        )
        .populate("customer", "name fullName phone")
        .populate("loan", "loanNumber")
        .lean(),
    ]);

    const loans = loanSummaryRows[0] || {};
    const payments = paymentSummaryRows[0] || {};
    const todayLoans = todayLoanSummaryRows[0] || {};
    const todayPayments = todayPaymentSummaryRows[0] || {};

    return res.status(200).json({
      success: true,
      branchId: String(branchId),
      generatedAt: now.toISOString(),
      timeZone: TIME_ZONE,

      summary: {
        totalLoans: loans.totalLoans || 0,
        totalPrincipal: loans.totalPrincipal || 0,
        outstandingBalance: loans.outstandingBalance || 0,
        totalPaymentCount: payments.totalPaymentCount || 0,
        totalPaymentAmount: payments.totalPaymentAmount || 0,
      },

      today: {
        loansCount: todayLoans.count || 0,
        loansAmount: todayLoans.amount || 0,
        paymentsCount: todayPayments.count || 0,
        paymentsAmount: todayPayments.amount || 0,
      },

      loanStatus: {
        active: loans.active || 0,
        overdue: loans.overdue || 0,
        defaulted: loans.defaulted || 0,
        paid: loans.paid || 0,
      },

      // Orodha hizi zina kikomo cha rekodi 50.
      // Takwimu za count na amount hapo juu zinajumuisha rekodi zote za leo.
      loansIssuedToday,
      paymentsReceivedToday,
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
