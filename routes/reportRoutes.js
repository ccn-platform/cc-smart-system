 const express = require("express");
const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const reportController =
  require("../controllers/reportController");

// SAFE CHECK
const safe =
  (fn, name) => {
    if (typeof fn !== "function") {
      console.error(
        `${name} is not a function`
      );

      return (req, res) =>
        res.status(500).json({
          message:
            `${name} missing`
        });
    }

    return fn;
  };

router.get(
  "/daily",
  protect,
  branchAccess,
  safe(
    reportController.getDailyReport,
    "getDailyReport"
  )
);

router.get(
  "/weekly",
  protect,
  branchAccess,
  safe(
    reportController.getWeeklyReport,
    "getWeeklyReport"
  )
);

router.get(
  "/monthly",
  protect,
  branchAccess,
  safe(
    reportController.getMonthlyReport,
    "getMonthlyReport"
  )
);

router.get(
  "/inventory",
  protect,
  branchAccess,
  safe(
    reportController.getInventoryReport,
    "getInventoryReport"
  )
);

router.get(
  "/top-products",
  protect,
  branchAccess,
  safe(
    reportController.getTopProductsReport,
    "getTopProductsReport"
  )
);

router.get(
  "/credit",
  protect,
  branchAccess,
  safe(
    reportController.getCreditReport,
    "getCreditReport"
  )
);

router.get(
  "/expense",
  protect,
  branchAccess,
  safe(
    reportController.getExpenseReport,
    "getExpenseReport"
  )
);

module.exports = router;
