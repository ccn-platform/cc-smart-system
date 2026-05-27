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
  syncOfflineLoan,
  syncOfflinePayment,
  syncOfflineCustomer,
  findOrCreateCustomer,
  checkCredit,
  createDebtLoan,
  receivePayment,
  getLoanHistory,
  searchCustomers,
  getPaymentHistory,
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
// SYNC OFFLINE CUSTOMER
router.post(
  "/sync-customer",
  protect,
  branchAccess,
  syncOfflineCustomer
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
router.post(
  "/sync-loan",
  protect,
  branchAccess,
  syncOfflineLoan
);
router.post(
  "/sync-payment",
  protect,
  branchAccess,
  syncOfflinePayment
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

router.get(
  "/search",
  protect,
  branchAccess,
  searchCustomers
);
// SINGLE LOAN
router.get(
  "/:id",
  protect,
  branchAccess,
  getLoanById
);

router.get(
  "/payment-history/:loanId",
  protect,
  branchAccess,
  getPaymentHistory
);
module.exports =
  router;
