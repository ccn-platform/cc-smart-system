  const express = require("express");
const multer = require("multer");

const router = express.Router();

const { protect } = require("../middleware/authMiddleware");

const {
scanOrder,
scanImage,
getOrderHistory,
getOrderById
} = require("../controllers/orderController");

// 🔥 MEMORY STORAGE (SAFE VERSION)
const upload = multer({
storage: multer.memoryStorage(),
limits: {
fileSize: 10 * 1024 * 1024 // 🔥 rudisha 10MB (important)
}
// ❌ fileFilter imeondolewa kwa sasa (ilikuwa inakata request mapema)
});

// 🔥 TEXT SCAN
router.post(
"/scan",
protect,
scanOrder
);

// 🔥 IMAGE OCR (SAFE MULTER HANDLING)
router.post(
"/scan-image",
protect,
(req, res, next) => {
console.log("📸 Upload request received");

```
upload.single("image")(req, res, function (err) {
  if (err) {
    console.log("UPLOAD ERROR:", err.message);

    return res.status(400).json({
      message:
        err.message ||
        "Upload failed or cancelled",
    });
  }

  if (!req.file) {
    return res.status(400).json({
      message: "No image uploaded"
    });
  }

  next();
});
```

},
scanImage
);

// 🔥 HISTORY (PAGINATION ?page=0)
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

module.exports = router;
