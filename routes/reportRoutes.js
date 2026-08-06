  const express = require("express");
const router = express.Router();

const middleware =
  require("../middleware/authMiddleware");

const reportController =
  require("../controllers/reportController");

console.log("MIDDLEWARE:", {
  protect:
    typeof middleware.protect,
  branchAccess:
    typeof middleware.branchAccess
});

router.get(
  "/daily",
  middleware.protect,
  middleware.branchAccess,
  reportController.getDailyReport
);

router.get(
  "/weekly",
  middleware.protect,
  middleware.branchAccess,
  reportController.getWeeklyReport
);

router.get(
  "/monthly",
  middleware.protect,
  middleware.branchAccess,
  reportController.getMonthlyReport
);

router.get(
  "/inventory",
  middleware.protect,
  middleware.branchAccess,
  reportController.getInventoryReport
);

router.get(
  "/top-products",
  middleware.protect,
  middleware.branchAccess,
  reportController.getTopProductsReport
);

router.get(
  "/credit",
  middleware.protect,
  middleware.branchAccess,
  reportController.getCreditReport
);

router.get(
  "/expense",
  middleware.protect,
  middleware.branchAccess,
  reportController.getExpenseReport
);

router.get(
  "/history",
  middleware.protect,
  middleware.branchAccess,
  reportController.getReportHistory
);
router.get(
  "/history/:id",
  middleware.protect,
  middleware.branchAccess,
  reportController.getReportHistoryById
);
module.exports = router;
