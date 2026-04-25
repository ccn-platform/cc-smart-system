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
  createCashEntry
);


// HISTORY
router.get(
  "/history",
  protect,
  getCashHistory
);


// SINGLE ENTRY
router.get(
  "/:id",
  protect,
  getCashById
);


// VOID ENTRY
router.put(
  "/:id/void",
  protect,
  voidCashEntry
);

module.exports =
router;