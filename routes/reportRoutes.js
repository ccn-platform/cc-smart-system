 const express = require("express");
const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getTopProductsReport,
  getCreditReport,
  getExpenseReport,
  getInventoryReport
} = require("../controllers/reportController");


// TIME REPORTS
router.get(
  "/daily",
  protect,
  branchAccess,
  getDailyReport
);

router.get(
  "/weekly",
  protect,
  branchAccess,
  getWeeklyReport
);

router.get(
  "/monthly",
  protect,
  branchAccess,
  getMonthlyReport
);


// BUSINESS REPORTS
router.get(
  "/inventory",
  protect,
  branchAccess,
  getInventoryReport
);

router.get(
  "/top-products",
  protect,
  branchAccess,
  getTopProductsReport
);


// FINANCIAL REPORTS
router.get(
  "/credit",
  protect,
  branchAccess,
  getCreditReport
);

router.get(
  "/expense",
  protect,
  branchAccess,
  getExpenseReport
);

module.exports = router;
