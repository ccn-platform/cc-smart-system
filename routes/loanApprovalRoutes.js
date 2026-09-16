const express = require("express");

const router = express.Router();

const {
  protect,
  branchAccess,
  onlyOwner
} = require("../middleware/authMiddleware");

const {
  decideLoanApplication
} = require("../controllers/loanApprovalController");

// APPROVE OR REJECT APPLICATION
router.post(
  "/:id/decision",
  protect,
  branchAccess,
  onlyOwner,
  decideLoanApplication
);

module.exports = router;
