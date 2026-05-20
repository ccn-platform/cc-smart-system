  const Product = require("../models/Product");
const normalizeProductName =
  require("../utils/normalizeProductName");


// CREATE PRODUCT
const createProduct = async (
  req,
  res
) => {
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

    if (!name?.trim()) {
      return res.status(400).json({
        message:
          "Product name required"
      });
    }

    const product =
  await Product.create({
    owner: req.ownerId,
    branch: req.branchId,

    name: name.trim(),

    barcode:
      barcode?.trim()
        ? barcode.trim()
        : null,

    category,
    unit,
    description,
    image,
    buyPrice,
    sellPrice,
    stockQty,
    lowStockAlert,

    createdBy: req.user.id
  });

    return res.status(201).json(
      product
    );

  } catch (error) {
    console.log(
      "CREATE PRODUCT ERROR:",
      error
    );

    if (error.code === 11000) {
  return res.status(400).json({
    message:
      "Bidhaa yenye jina hili tayari ipo kwenye tawi hili"
  });
}

return res.status(500).json({
  message:
    error.message
});
  }
};


// GET PRODUCTS
const getProducts = async (
  req,
  res
) => {
  try {
    const page =
      Number(req.query.page) || 0;

    const limit = 20;

    const skip =
      page * limit;

    const products =
      await Product.find({
        owner: req.ownerId,
        branch: req.branchId,
        isActive: true
      })
        .sort({
          createdAt: -1
        })
        .limit(limit)
        .skip(skip)
        .select(
          "name sellPrice stockQty barcode"
        );

    return res.status(200).json(
      products
    );

  } catch (error) {
    return res.status(500).json({
      message:
        error.message
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

    const page =
      Number(req.query.page) || 0;

    const limit = 20;
    const skip =
      page * limit;

    let products =
      await Product.find(
        {
          owner: req.ownerId,
          branch: req.branchId,
          isActive: true,
          $text: {
            $search: keyword
          }
        },
        {
          score: {
            $meta:
              "textScore"
          }
        }
      )
        .sort({
          score: {
            $meta:
              "textScore"
          }
        })
        .limit(limit)
        .skip(skip)
        .select(
          "name sellPrice stockQty barcode"
        );

    if (
      !products.length &&
      keyword
    ) {
      products =
        await Product.find({
          owner: req.ownerId,
          branch: req.branchId,
          isActive: true,
          $or: [
            {
              name: {
                $regex:
                  keyword,
                $options:
                  "i"
              }
            },
            {
              aliases: {
                $regex:
                  keyword,
                $options:
                  "i"
              }
            },
            {
              barcode:
                keyword
            }
          ]
        })
          .limit(limit)
          .skip(skip)
          .select(
            "name sellPrice stockQty barcode"
          );
    }

    return res.status(200).json(
      products
    );

  } catch (error) {
    return res.status(500).json({
      message:
        error.message
    });
  }
};


// UPDATE PRODUCT
const updateProduct = async (
  req,
  res
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message:
          "Unauthorized"
      });
    }

    const product =
      await Product.findOne({
        _id:
          req.params.id,
        owner:
          req.ownerId,
        branch:
          req.branchId,
        isActive: true
      });

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found"
      });
    }

    let updateData = {};

    if (
      req.user.role ===
      "owner"
    ) {
      updateData = {
        ...req.body
      };

      if (
        req.body.name
      ) {
        updateData.normalizedName =
          normalizeProductName(
            req.body.name
          );
      }
    }

    if (
      req.user.role ===
      "staff"
    ) {
      if (
        req.body.sellPrice !==
        undefined
      ) {
        updateData.sellPrice =
          req.body.sellPrice;
      } else {
        return res.status(403).json({
          message:
            "Staff can only update price"
        });
      }
    }

    if (
      Object.keys(
        updateData
      ).length === 0
    ) {
      return res.status(400).json({
        message:
          "No valid fields to update"
      });
    }

    const updated =
      await Product.findOneAndUpdate(
        {
          _id:
            req.params.id,
          owner:
            req.ownerId,
          branch:
            req.branchId
        },
        {
          ...updateData,
          updatedBy:
            req.user.id
        },
        {
          new: true,
          runValidators: true
        }
      );

    return res.status(200).json(
      updated
    );

  } catch (error) {
    console.log(
      "UPDATE PRODUCT ERROR:",
      error
    );

    if (error.code === 11000) {
  return res.status(400).json({
    message:
      "Bidhaa yenye jina hili tayari ipo kwenye tawi hili"
  });
}

return res.status(500).json({
  message:
    error.message
});
  }
};


// DELETE PRODUCT
const deleteProduct = async (
  req,
  res
) => {
  try {
    if (
      !req.user ||
      req.user.role !==
        "owner"
    ) {
      return res.status(403).json({
        message:
          "Only owner can delete product"
      });
    }

    const product =
      await Product.findOne({
        _id:
          req.params.id,
        owner:
          req.ownerId,
        branch:
          req.branchId,
        isActive: true
      });

    if (!product) {
      return res.status(404).json({
        message:
          "Product not found"
      });
    }

    product.isActive =
      false;

    product.deletedBy =
      req.user.id;

    await product.save({
      validateBeforeSave:
        false
    });

    return res.status(200).json({
      message:
        "Product deleted"
    });

  } catch (error) {
    console.log(
      "DELETE PRODUCT ERROR:",
      error
    );

    return res.status(500).json({
      message:
        error.message
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
