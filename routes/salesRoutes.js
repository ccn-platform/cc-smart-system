const express = require("express");
const router = express.Router();

const {
  protect
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
  createSale
);


// GET ALL SALES
router.get(
  "/",
  protect,
  getSales
);


// TODAY SUMMARY
router.get(
  "/today",
  protect,
  getTodaySales
);

module.exports = router;