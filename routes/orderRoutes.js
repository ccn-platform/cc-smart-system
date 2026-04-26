  const express =
require("express");

const multer =
require("multer");

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


// Memory storage
const upload =
multer({
  storage:
    multer.memoryStorage(),
  limits: {
    fileSize:
      10 * 1024 * 1024
  }
});


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
  upload.single(
    "image"
  ),
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
