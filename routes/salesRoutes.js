  const express = require("express");
const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const {
  createSale,
  getSales,
  getTodaySales
} = require("../controllers/salesController");


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


// TODAY SUMMARY
router.get(
  "/today",
  protect,
  branchAccess,
  getTodaySales
);

module.exports = router;
