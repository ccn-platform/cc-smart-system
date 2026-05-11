 const express = require("express");
const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const reportController =
  require("../controllers/reportController");

console.log(
  "REPORT CONTROLLER:",
  reportController
);

router.get(
  "/daily",
  protect,
  branchAccess,
  reportController.getDailyReport
);

router.get(
  "/weekly",
  protect,
  branchAccess,
  reportController.getWeeklyReport
);

router.get(
  "/monthly",
  protect,
  branchAccess,
  reportController.getMonthlyReport
);

router.get(
  "/inventory",
  protect,
  branchAccess,
  reportController.getInventoryReport
);

router.get(
  "/top-products",
  protect,
  branchAccess,
  reportController.getTopProductsReport
);

router.get(
  "/credit",
  protect,
  branchAccess,
  reportController.getCreditReport
);

router.get(
  "/expense",
  protect,
  branchAccess,
  reportController.getExpenseReport
);

module.exports = router;
