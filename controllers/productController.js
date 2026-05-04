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

    const product = await Product.create({
      owner: req.ownerId,
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


// GET PRODUCTS (🔥 PAGINATION ADDED)
const getProducts = async (req, res) => {
  try {
    const page = Number(req.query.page) || 0;
    const limit = 20;
    const skip = page * limit;

    const products = await Product.find({
       owner: req.ownerId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select("name sellPrice stockQty barcode");

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// SEARCH PRODUCTS (🔥 FAST SEARCH)
const searchProducts = async (req, res) => {
  try {
    const keyword = req.query.keyword || "";
    const page = Number(req.query.page) || 0;

    const limit = 20;
    const skip = page * limit;

    // 🔥 TEXT SEARCH (fast)
    let products = await Product.find(
      {
        owner: req.ownerId,
        isActive: true,
        $text: { $search: keyword }
      },
      {
        score: { $meta: "textScore" }
      }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .skip(skip)
      .select("name sellPrice stockQty barcode");

    // 🔥 FALLBACK (regex + barcode)
    if (!products.length && keyword) {
      products = await Product.find({
         owner: req.ownerId,
        isActive: true,
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { aliases: { $regex: keyword, $options: "i" } },
          { barcode: keyword }
        ]
      })
        .limit(limit)
        .skip(skip)
        .select("name sellPrice stockQty barcode");
    }

    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// UPDATE PRODUCT (🔥 SAFE UPDATE)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
       owner: req.ownerId,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true // 🔥 important
      }
    );

    res.status(200).json(updated);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// DELETE PRODUCT (SOFT DELETE)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
     owner: req.ownerId,
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    product.isActive = false;

    await product.save();

    res.status(200).json({
      message: "Product deleted"
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
