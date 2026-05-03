
 const express = require("express");
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


 
 // TIME-BASED
router.get("/daily", protect, getDailyReport);
router.get("/weekly", protect, getWeeklyReport);
router.get("/monthly", protect, getMonthlyReport);

// BUSINESS REPORTS
router.get("/inventory", protect, getInventoryReport);
router.get("/top-products", protect, getTopProductsReport);

// FINANCIAL
router.get("/credit", protect, getCreditReport);
router.get("/expense", protect, getExpenseReport);

module.exports =
router;
