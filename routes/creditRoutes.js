 const express =
require("express");

const router =
express.Router();

const {
  protect
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
  getOverdueLoans
} = require(
  "../controllers/creditController"
);


// FIND OR CREATE CUSTOMER
router.post("/customer",protect,findOrCreateCustomer);


// CHECK CREDIT
router.post("/check",protect,checkCredit);


// CREATE LOAN
router.post("/loan",protect,createDebtLoan);


// RECEIVE PAYMENT
router.post("/payment",protect,receivePayment);


// LOAN HISTORY
router.get("/history",protect,getLoanHistory);


// SINGLE LOAN
router.get("/:id",protect,getLoanById);

router.get("/overdue",protect,getOverdueLoans);
module.exports =
router;