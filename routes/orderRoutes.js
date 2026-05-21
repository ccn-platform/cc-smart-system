  const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const {
  scanOrder,
  scanImage,
  deleteOrder,
  confirmOrder,
  getOrderHistory,
  getOrderById,
  getOrderProfitSummary
} = require("../controllers/orderController");


// TEMP UPLOAD DIR
const uploadDir = path.join(
  __dirname,
  "../uploads/temp"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true
  });
}


// DISK STORAGE (PRODUCTION SAFE)
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

    const fileName =
      `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}${ext}`;

    cb(null, fileName);
  }
});


// UPLOAD CONFIG
const upload = multer({
  storage,

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
      file.mimetype &&
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
      {
        size: req.file.size,
        path: req.file.path
      }
    );

    next();
  },
  scanImage
);


router.post(
  "/confirm",
  protect,
  branchAccess,
  confirmOrder
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


router.delete(
  "/:id",
  protect,
  branchAccess,
  deleteOrder
);

module.exports = router;
