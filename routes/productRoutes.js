 const express = require("express");
const router = express.Router();

const {
  protect,
  branchAccess
} = require("../middleware/authMiddleware");

const {
  createProduct,
  getProducts,
  searchProducts,
  updateProduct,
  deleteProduct
} = require("../controllers/productController");


// CREATE + GET PRODUCTS
router
  .route("/")
  .post(
    protect,
    branchAccess,
    createProduct
  )
  .get(
    protect,
    branchAccess,
    getProducts
  );


// SEARCH PRODUCTS
router.get(
  "/search",
  protect,
  branchAccess,
  searchProducts
);


// UPDATE + DELETE
router
  .route("/:id")
  .put(
    protect,
    branchAccess,
    updateProduct
  )
  .delete(
    protect,
    branchAccess,
    deleteProduct
  );

module.exports = router;
