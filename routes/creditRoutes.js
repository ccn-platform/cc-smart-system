 const express =
  require("express");

const router =
  express.Router();

const {
  protect,
  branchAccess
} = require(
  "../middleware/authMiddleware"
);

const {
  findOrCreateCustomer,
  checkCredit,
  createDebtLoan,
  receivePayment,
  getLoanHistory,
  getLoanById,
  scanFingerprint,
  getOverdueLoans
} = require(
  "../controllers/creditController"
);


// SCAN FINGERPRINT
router.post(
  "/scan-fingerprint",
  protect,
  branchAccess,
  scanFingerprint
);


// FIND OR CREATE CUSTOMER
router.post(
  "/customer",
  protect,
  branchAccess,
  findOrCreateCustomer
);


// CHECK CREDIT
router.post(
  "/check",
  protect,
  branchAccess,
  checkCredit
);


// CREATE LOAN
router.post(
  "/loan",
  protect,
  branchAccess,
  createDebtLoan
);


// RECEIVE PAYMENT
router.post(
  "/payment",
  protect,
  branchAccess,
  receivePayment
);


// LOAN HISTORY
router.get(
  "/history",
  protect,
  branchAccess,
  getLoanHistory
);


// OVERDUE
router.get(
  "/overdue",
  protect,
  branchAccess,
  getOverdueLoans
);


// SINGLE LOAN
router.get(
  "/:id",
  protect,
  branchAccess,
  getLoanById
);

module.exports =
  router;
