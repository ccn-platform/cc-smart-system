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
  createSale,
  getSales,
  getTodaySales,
  getSaleById,
  searchSales,
  holdSale,
  getHeldSales,
  resumeHeldSale,
  deleteHeldSale,
  refundSale
} = require(
  "../controllers/salesController"
);


// CREATE SALE
router.post(
  "/",
  protect,
  branchAccess,
  createSale
);


// GET ALL SALES
router.get(
  "/",
  protect,
  branchAccess,
  getSales
);


// TODAY SALES
router.get(
  "/today",
  protect,
  branchAccess,
  getTodaySales
);


// GET SINGLE SALE
router.get(
  "/:id",
  protect,
  branchAccess,
  getSaleById
);


// SEARCH SALES
router.get(
  "/search",
  protect,
  branchAccess,
  searchSales
);


// HOLD SALE
router.post(
  "/hold",
  protect,
  branchAccess,
  holdSale
);


// GET HELD SALES
router.get(
  "/hold",
  protect,
  branchAccess,
  getHeldSales
);


// RESUME HELD SALE
router.get(
  "/hold/:id",
  protect,
  branchAccess,
  resumeHeldSale
);


// DELETE HELD SALE
router.delete(
  "/hold/:id",
  protect,
  branchAccess,
  deleteHeldSale
);


// REFUND SALE
router.post(
  "/:id/refund",
  protect,
  branchAccess,
  refundSale
);

module.exports =
  router;
