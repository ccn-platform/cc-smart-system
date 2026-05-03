   const express = require("express");
const multer = require("multer");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
  scanOrder,
  scanImage,
  getOrderHistory,
  getOrderById,
  getOrderProfitSummary
} = require("../controllers/orderController");


// 🔥 Memory storage (same as yours)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 🔥 reduce 10MB → 5MB (safer)
  },
  fileFilter: (req, file, cb) => {
    // 🔥 accept only images
    if (
      file.mimetype.startsWith("image/")
    ) {
      cb(null, true);
    } else {
      cb(
        new Error("Only images allowed"),
        false
      );
    }
  }
});


// 🔥 TEXT SCAN
router.post(
  "/scan",
  protect,
  scanOrder
);


 router.post(
  "/scan-image",
  protect,
  (req, res, next) => {
    console.log("📸 Upload request received");

    upload.single("image")(req, res, function (err) {
      if (err) {
        console.log("❌ MULTER ERROR:", err.message);

        return res.status(400).json({
          message: err.message || "Upload failed",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message: "No image uploaded",
        });
      }

      console.log("✅ File received:", req.file.size, "bytes");

      next();
    });
  },
  scanImage
);

// 🔥 HISTORY (with pagination ?page=0)
router.get(
  "/history",
  protect,
  getOrderHistory
);


// 🔥 SINGLE ORDER
router.get(
  "/:id",
  protect,
  getOrderById
);

// 🔥 ORDER PROFIT SUMMARY
router.get(
  "/profit-summary",
  protect,
  getOrderProfitSummary
);
module.exports = router;
