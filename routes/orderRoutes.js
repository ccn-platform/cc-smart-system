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
  scanOrder,
  scanImage,
  getOrderHistory,
  getOrderById
} = require(
  "../controllers/orderController"
);


// Scan pasted text
router.post(
  "/scan",
  protect,
  scanOrder
);


// Scan image OCR
router.post(
  "/scan-image",
  protect,
  scanImage
);


// Order history
router.get(
  "/history",
  protect,
  getOrderHistory
);


// Single order detail
router.get(
  "/:id",
  protect,
  getOrderById
);

module.exports =
router;