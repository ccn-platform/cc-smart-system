  const express = require("express");

const router = express.Router();

const middleware =
require("../middleware/authMiddleware");

const reportController =
require("../controllers/reportController");

// ============================================
// MIDDLEWARE CHECK
// ============================================

console.log("MIDDLEWARE:", {

protect:
typeof middleware.protect,

branchAccess:
typeof middleware.branchAccess

});

// ============================================
// DAILY REPORT
// ============================================

router.get(

"/daily",

middleware.protect,

middleware.branchAccess,

reportController.getDailyReport

);

// ============================================
// WEEKLY REPORT
// ============================================

router.get(

"/weekly",

middleware.protect,

middleware.branchAccess,

reportController.getWeeklyReport

);

// ============================================
// MONTHLY REPORT
// ============================================

router.get(

"/monthly",

middleware.protect,

middleware.branchAccess,

reportController.getMonthlyReport

);

// ============================================
// INVENTORY REPORT
// ============================================

router.get(

"/inventory",

middleware.protect,

middleware.branchAccess,

reportController.getInventoryReport

);

// ============================================
// TOP PRODUCTS REPORT
// ============================================

router.get(

"/top-products",

middleware.protect,

middleware.branchAccess,

reportController.getTopProductsReport

);

// ============================================
// CREDIT REPORT
// ============================================

router.get(

"/credit",

middleware.protect,

middleware.branchAccess,

reportController.getCreditReport

);

// ============================================
// EXPENSE REPORT
// ============================================

router.get(

"/expense",

middleware.protect,

middleware.branchAccess,

reportController.getExpenseReport

);

// =================================================
// NEW
// CURRENT CREDIT REPORT HISTORY
//
// USED BY:
// ReportHistoryScreen
//
// GET:
// /reports/credit-history
// =================================================

router.get(

"/credit-history",

middleware.protect,

middleware.branchAccess,

reportController
.getCurrentCreditReportHistory

);

// =================================================
// NEW
// CREDIT REPORT HISTORY BY DATE
//
// USED BY:
// HistoryDetailsScreen
//
// EXAMPLE:
// /reports/credit-history/2026-08-28
// =================================================

router.get(

"/credit-history/:date",

middleware.protect,

middleware.branchAccess,

reportController
.getCreditReportHistoryByDate

);

// ============================================
// GENERAL REPORT HISTORY
// ============================================

router.get(

"/history",

middleware.protect,

middleware.branchAccess,

reportController.getReportHistory

);

// ============================================
// REPORT HISTORY BY ID
// ============================================

router.get(

"/history/:id",

middleware.protect,

middleware.branchAccess,

reportController.getReportHistoryById

);

// ============================================
// EXPORT
// ============================================

module.exports =
router;
