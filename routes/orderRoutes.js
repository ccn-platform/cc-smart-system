  const express = require("express");
const multer = require("multer");

const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const {
  scanOrder,
  scanImage,
  getOrderHistory,
  getOrderById,
  getOrderProfitSummary
} = require("../controllers/orderController");


// MEMORY STORAGE
const upload = multer({
  storage:
    multer.memoryStorage(),

  limits: {
    fileSize:
      5 * 1024 * 1024
  },

  fileFilter: (
    req,
    file,
    cb
  ) => {
    if (
      file.mimetype.startsWith(
        "image/"
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Only images allowed"
        ),
        false
      );
    }
  }
});


// TEXT SCAN
router.post(
  "/scan",
  protect,
  branchAccess,
  scanOrder
);


// IMAGE SCAN
router.post(
  "/scan-image",
  protect,
  branchAccess,
  upload.single("image"),
  (
    req,
    res,
    next
  ) => {
    console.log(
      "📸 Upload request received"
    );

    if (!req.file) {
      return res.status(400).json({
        message:
          "No image uploaded"
      });
    }

    console.log(
      "✅ File received:",
      req.file.size,
      "bytes"
    );

    next();
  },
  scanImage
);


// HISTORY
router.get(
  "/history",
  protect,
  branchAccess,
  getOrderHistory
);


// PROFIT SUMMARY
router.get(
  "/profit-summary",
  protect,
  branchAccess,
  getOrderProfitSummary
);


// SINGLE ORDER
router.get(
  "/:id",
  protect,
  branchAccess,
  getOrderById
);

module.exports = router;
