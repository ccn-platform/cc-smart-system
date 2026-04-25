
const express =
require("express");

const router =
express.Router();

const {
  protect
} = require(
  "../middleware/authMiddleware"
);

const {
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getTopProductsReport,
  getCreditReport,
  getExpenseReport,
  getInventoryReport
} = require(
  "../controllers/reportController"
);


// DAILY REPORT
router.get(
  "/daily",
  protect,
  getDailyReport
);
router.get(
  "/monthly",
  protect,
  getMonthlyReport
);

router.get(
  "/weekly",
  protect,
  getWeeklyReport
);

router.get(
  "/top-products",
  protect,
  getTopProductsReport
);

router.get(
  "/credit",
  protect,
  getCreditReport
);

router.get(
  "/expense",
  protect,
  getExpenseReport
);

router.get(
  "/inventory",
  protect,
  getInventoryReport
);
module.exports =
router;