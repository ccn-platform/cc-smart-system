 const express = require("express");
const router = express.Router();

const middleware =
  require("../middleware/authMiddleware");

const reports =
  require("../controllers/reportController");

console.log("MIDDLEWARE:", middleware);
console.log("REPORTS:", reports);

router.get(
  "/daily",
  middleware.protect,
  middleware.branchAccess,
  reports.getDailyReport
);

module.exports = router;
