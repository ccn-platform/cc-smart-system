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

// 🔥 CREATE + GET (with pagination kupitia query ?page=0)
router
  .route("/")
  .post(protect, createProduct)
  .get(protect, getProducts);

// 🔥 SEARCH (query: ?keyword=milk&page=0)
router.get(
  "/search",
  protect,
  searchProducts
);

// 🔥 UPDATE + DELETE
router
  .route("/:id")
  .put(protect, updateProduct)
  .delete(protect, deleteProduct);

module.exports = router;
