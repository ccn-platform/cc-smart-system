   const Product = require("../models/Product");

 const normalizeProductName =
 require("../utils/normalizeProductName");
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

 const updateProduct = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized"
      });
    }

    // 🔍 hakikisha product ipo
    const product = await Product.findOne({
      _id: req.params.id,
      owner: req.ownerId,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    let updateData = {};

    // 🔥 OWNER → anaweza kubadilisha kila kitu
    if (req.user.role === "owner") {
      updateData = {
        ...req.body
      };

    
if (req.body.name) {
  updateData.normalizedName =
    normalizeProductName(req.body.name);
}
   }   // 🔥 STAFF → anaruhusiwa sellPrice tu
    if (req.user.role === "staff") {
      if (req.body.sellPrice !== undefined) {
        updateData.sellPrice = req.body.sellPrice;
      } else {
        return res.status(403).json({
          message: "Staff can only update price"
        });
      }
    }

    // 🔥 hakuna kitu cha ku-update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        message: "No valid fields to update"
      });
    }

    // 🔥 UPDATE
    const updated = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        owner: req.ownerId
      },
      {
        ...updateData,
        updatedBy: req.user.id
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json(updated);

  } catch (error) {
    console.log("UPDATE PRODUCT ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};

// DELETE PRODUCT (SOFT DELETE)
 
const deleteProduct = async (req, res) => {
  try {
    // 🔐 SECURITY: owner tu
    if (!req.user || req.user.role !== "owner") {
      return res.status(403).json({
        message: "Only owner can delete product"
      });
    }

    // 🔍 hakikisha product ipo na ni ya owner huyu
    const product = await Product.findOne({
      _id: req.params.id,
      owner: req.ownerId,
      isActive: true
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    // 🔥 SOFT DELETE + AUDIT
    product.isActive = false;
    product.deletedBy = req.user.id;

     await product.save({ validateBeforeSave: false });

    res.status(200).json({
      message: "Product deleted"
    });

  } catch (error) {
    console.log("DELETE PRODUCT ERROR:", error);
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
