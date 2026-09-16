const express = require("express");

const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const {
  createLoanApplication,
  getLoanApplications,
  getLoanApplicationById,
  cancelLoanApplication
} = require("../controllers/loanApplicationController");

// CREATE APPLICATION
router.post(
  "/",
  protect,
  branchAccess,
  createLoanApplication
);

// LIST APPLICATIONS
router.get(
  "/",
  protect,
  branchAccess,
  getLoanApplications
);

// CANCEL APPLICATION
router.patch(
  "/:id/cancel",
  protect,
  branchAccess,
  cancelLoanApplication
);

// GET ONE APPLICATION
router.get(
  "/:id",
  protect,
  branchAccess,
  getLoanApplicationById
);

module.exports = router;
