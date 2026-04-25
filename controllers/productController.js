 const Product = require("../models/Product");


// CREATE PRODUCT
const createProduct = async (req, res) => {
  try {
    const {
      name,
      barcode,
      category,
      unit,
      description,
      image,
      buyPrice,
      sellPrice,
      stockQty,
      lowStockAlert
    } = req.body;

    if (!name) {
      return res.status(400).json({
        message: "Product name required"
      });
    }

    const product =
      await Product.create({
        user: req.user.id,

        name,
        barcode,
        category,
        unit,
        description,
        image,

        buyPrice,
        sellPrice,
        stockQty,
        lowStockAlert
      });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// GET PRODUCTS
const getProducts = async (req, res) => {
  try {
    const products =
      await Product.find({
        user: req.user.id,
        isActive: true
      }).sort({
        createdAt: -1
      });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// SEARCH PRODUCTS
const searchProducts = async (
  req,
  res
) => {
  try {
    const keyword =
      req.query.keyword || "";

    const products =
      await Product.find({
        user: req.user.id,
        isActive: true,
        name: {
          $regex: keyword,
          $options: "i"
        }
      });

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// UPDATE PRODUCT
const updateProduct = async (
  req,
  res
) => {
  try {
    const product =
      await Product.findOne({
        _id: req.params.id,
        user: req.user.id
      });

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found"
      });
    }

    const updated =
      await Product.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true }
      );

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// DELETE PRODUCT
const deleteProduct = async (
  req,
  res
) => {
  try {
    const product =
      await Product.findOne({
        _id: req.params.id,
        user: req.user.id
      });

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found"
      });
    }

    product.isActive = false;

    await product.save();

    res.status(200).json({
      message:
        "Product deleted"
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


module.exports = {
  createProduct,
  getProducts,
  searchProducts,
  updateProduct,
  deleteProduct
};