 
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
  protect: typeof middleware.protect,
  branchAccess: typeof middleware.branchAccess
});

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

// ============================================
// CURRENT CREDIT REPORT HISTORY
// GET /reports/credit-history
// ============================================

router.get(
  "/credit-history",
  middleware.protect,
  middleware.branchAccess,
  reportController.getCurrentCreditReportHistory
);

// ============================================
// REPORT HISTORY BY ID
// GET /reports/history/:id
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

module.exports = router;
