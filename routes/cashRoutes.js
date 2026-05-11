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
  createCashEntry,
  getCashHistory,
  getCashById,
  voidCashEntry
} = require(
  "../controllers/cashController"
);


// CREATE ENTRY
router.post(
  "/",
  protect,
  branchAccess,
  createCashEntry
);


// HISTORY
router.get(
  "/history",
  protect,
  branchAccess,
  getCashHistory
);


// SINGLE ENTRY
router.get(
  "/:id",
  protect,
  branchAccess,
  getCashById
);


// VOID ENTRY
router.put(
  "/:id/void",
  protect,
  branchAccess,
  voidCashEntry
);

module.exports =
  router;
