const express = require("express");
const router = express.Router();

const {
  protect
} = require("../middleware/authMiddleware");

const {
  createProduct,
  getProducts,
  searchProducts,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");

router
  .route("/")
  .post(protect, createProduct)
  .get(protect, getProducts);

router.get(
  "/search",
  protect,
  searchProducts
);

router
  .route("/:id")
  .put(protect, updateProduct)
  .delete(
    protect,
    deleteProduct
  );

module.exports = router;