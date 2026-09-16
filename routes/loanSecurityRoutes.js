const express = require("express");

const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const {
  createLoanSecurity,
  getLoanSecurities,
  getLoanSecurityById,
  updateLoanSecurity,
  releaseLoanSecurity
} = require("../controllers/loanSecurityController");

// CREATE SECURITY
router.post(
  "/",
  protect,
  branchAccess,
  createLoanSecurity
);

// LIST SECURITIES
router.get(
  "/",
  protect,
  branchAccess,
  getLoanSecurities
);

// UPDATE SECURITY
router.patch(
  "/:id",
  protect,
  branchAccess,
  updateLoanSecurity
);

// RELEASE SECURITY
router.patch(
  "/:id/release",
  protect,
  branchAccess,
  releaseLoanSecurity
);

// GET ONE SECURITY
router.get(
  "/:id",
  protect,
  branchAccess,
  getLoanSecurityById
);

module.exports = router;
