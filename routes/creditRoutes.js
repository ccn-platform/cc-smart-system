   
  const multer = require("multer");
const path = require("path");
const fs = require("fs");
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
   scanDebtsFromImage,
   deleteDebtLoan,
  createDebtLoan,
   syncLoan,
   syncPayment,
  refundPayment,
  receivePayment,
  getLoanHistory,
  getPaymentHistory,
  getLoanById,
  scanFingerprint,
  getOverdueLoans,
  importDebts
} = require(
  "../controllers/creditController"
);

const uploadDir = path.join(
  __dirname,
  "../uploads/temp"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}

const storage = multer.diskStorage({
  destination: (
    req,
    file,
    cb
  ) => {
    cb(null, uploadDir);
  },

  filename: (
    req,
    file,
    cb
  ) => {
    const ext =
      path.extname(
        file.originalname || ".jpg"
      );

    cb(
      null,
      `${Date.now()}${ext}`
    );
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize:
      5 * 1024 * 1024
  }
});


// SCAN FINGERPRINT
router.post(
  "/scan-fingerprint",
  protect,
  branchAccess,
  scanFingerprint
);

router.post(
  "/scan-debts",
  protect,
  branchAccess,
  upload.single("image"),
  scanDebtsFromImage
);

router.post(
  "/import-debts",
  protect,
  branchAccess,
  importDebts
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
// SYNC OFFLINE LOAN
router.post(
  "/sync-loan",
  protect,
  branchAccess,
  syncLoan
);

// SYNC OFFLINE PAYMENT
router.post(
  "/sync-payment",
  protect,
  branchAccess,
  syncPayment
);
// RECEIVE PAYMENT
router.post(
  "/payment",
  protect,
  branchAccess,
  receivePayment
);
router.post(
  "/refund",
  protect,
  branchAccess,
  refundPayment
);

router.delete(
  "/loan/:id",
  protect,
  branchAccess,
  deleteDebtLoan
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

router.get(
  "/payment-history/:loanId",
  protect,
  branchAccess,
  getPaymentHistory
);
module.exports =
  router;
