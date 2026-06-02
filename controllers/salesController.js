  const Sale =
  require("../models/Sale");

const HeldSale =
  require("../models/HeldSale");

const Product =
  require("../models/Product");

const calculateProfit =
  require("../utils/calculateprofit");

const generateReceipt =
  require("../utils/generateReceipt");


// CREATE SALE
const createSale = async (
  req,
  res
) => {
  try {
    const {
  items,
  paymentMethod,
  customerName
} = req.body;

    if (
      !items ||
      items.length === 0
    ) {
      return res.status(400).json({
        message: "Cart is empty"
      });
    }

    let saleItems = [];
    let totalAmount = 0;
    let totalProfit = 0;

    for (const item of items) {
      const product =
        await Product.findOne({
          _id: item.productId,
          owner: req.ownerId,
          branch: req.branchId,
          isActive: true
        });

      if (!product) {
        return res.status(404).json({
          message:
            "Product not found"
        });
      }

      if (
        product.stockQty <
        item.qty
      ) {
        return res.status(400).json({
          message:
            `${product.name} stock not enough`
        });
      }

      const lineTotal =
        product.sellPrice *
        item.qty;

      const lineProfit =
        calculateProfit(
          product.sellPrice,
          product.buyPrice,
          item.qty
        );

      totalAmount +=
        lineTotal;

      totalProfit +=
        lineProfit;

      saleItems.push({
        product:
          product._id,
        name:
          product.name,
        qty:
          item.qty,
        price:
          product.sellPrice,
        buyPrice:
          product.buyPrice,
        total:
          lineTotal
      });

      product.stockQty -=
        item.qty;

      await product.save();
    }

    const receiptNo =
      generateReceipt();

  const sale =
  await Sale.create({
    owner: req.ownerId,
    branch: req.branchId,
    items: saleItems,
    totalAmount,
    totalProfit,
    paymentMethod,
    customerName:
      customerName?.trim() || "",
    receiptNo
  });

    return res.status(201).json(
      sale
    );

  } catch (error) {
    return res.status(500).json({
      message:
        error.message
    });
  }
};


// GET ALL SALES
 const getSales = async (
  req,
  res
) => {
  try {
    const period =
      req.query.period ||
      "today";

    const now =
      new Date();

    let start = null;

    let end =
      new Date(now);

    end.setHours(
      23,
      59,
      59,
      999
    );

    switch (period) {
      case "today":
        start =
          new Date(now);

        start.setHours(
          0,
          0,
          0,
          0
        );
        break;

      case "week":
        start =
          new Date(now);

        start.setDate(
          start.getDate() - 7
        );

        start.setHours(
          0,
          0,
          0,
          0
        );
        break;

      case "month":
        start =
          new Date(now);

        start.setDate(
          start.getDate() - 30
        );

        start.setHours(
          0,
          0,
          0,
          0
        );
        break;

      case "all":
        start = null;
        break;

      default:
        start =
          new Date(now);

        start.setHours(
          0,
          0,
          0,
          0
        );
    }

    const query = {
      owner: req.ownerId,
      branch: req.branchId
    };

    if (start) {
      query.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    const sales =
      await Sale.find(query)
        .sort({
          createdAt: -1
        });

    return res.status(200).json(
      sales
    );

  } catch (error) {
    return res.status(500).json({
      message:
        error.message
    });
  }
};

// GET TODAY SALES
const getTodaySales =
  async (req, res) => {
    try {
      const start =
        new Date();

      start.setHours(
        0,
        0,
        0,
        0
      );

      const sales =
        await Sale.find({
          owner: req.ownerId,
          branch: req.branchId,
          createdAt: {
            $gte: start
          }
        }).sort({
          createdAt: -1
        });

      return res.status(200).json(
        sales
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// GET SINGLE SALE
const getSaleById =
  async (req, res) => {
    try {
      const sale =
        await Sale.findOne({
          _id:
            req.params.id,
          owner:
            req.ownerId,
          branch:
            req.branchId
        });

      if (!sale) {
        return res.status(404).json({
          message:
            "Sale not found"
        });
      }

      return res.status(200).json(
        sale
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// SEARCH SALES
const searchSales =
  async (req, res) => {
    try {
      const q =
        req.query.q || "";

      const sales =
        await Sale.find({
          owner:
            req.ownerId,
          branch:
            req.branchId,
          receiptNo: {
            $regex: q,
            $options:
              "i"
          }
        }).sort({
          createdAt: -1
        });

      return res.status(200).json(
        sales
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// HOLD SALE
const holdSale = async (
  req,
  res
) => {
  try {
     const {
  items,
  totalAmount,
  customerName
} = req.body;

    if (
      !items ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "No items to hold"
      });
    }

    const heldItems =
      [];

    for (const item of items) {
      const product =
        await Product.findOne({
          _id:
            item.productId,
          owner:
            req.ownerId,
          branch:
            req.branchId
        });

      if (!product) {
        continue;
      }

      heldItems.push({
        product:
          product._id,
        name:
          product.name,
        qty:
          item.qty,
        price:
          product.sellPrice,
        total:
          product.sellPrice *
          item.qty
      });
    }

  const held =
  await HeldSale.create({
    owner:
      req.ownerId,
    branch:
      req.branchId,
    items:
      heldItems,
    totalAmount,
    customerName:
      customerName?.trim() || ""
  });

    return res.status(201).json(
      held
    );

  } catch (error) {
    return res.status(500).json({
      message:
        error.message
    });
  }
};


// GET HELD SALES
const getHeldSales =
  async (req, res) => {
    try {
      const held =
        await HeldSale.find({
          owner:
            req.ownerId,
          branch:
            req.branchId
        }).sort({
          createdAt: -1
        });

      return res.status(200).json(
        held
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// RESUME HELD SALE
const resumeHeldSale =
  async (req, res) => {
    try {
      const held =
        await HeldSale.findOne({
          _id:
            req.params.id,
          owner:
            req.ownerId,
          branch:
            req.branchId
        });

      if (!held) {
        return res.status(404).json({
          message:
            "Held order not found"
        });
      }

      return res.status(200).json(
        held
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// DELETE HELD SALE
const deleteHeldSale =
  async (req, res) => {
    try {
      const held =
        await HeldSale.findOne({
          _id:
            req.params.id,
          owner:
            req.ownerId,
          branch:
            req.branchId
        });

      if (!held) {
        return res.status(404).json({
          message:
            "Held order not found"
        });
      }

      await held.deleteOne();

      return res.status(200).json({
        message:
          "Held order deleted"
      });

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// REFUND SALE
const refundSale =
  async (req, res) => {
    try {
      const sale =
        await Sale.findOne({
          _id:
            req.params.id,
          owner:
            req.ownerId,
          branch:
            req.branchId
        });

      if (!sale) {
        return res.status(404).json({
          message:
            "Sale not found"
        });
      }

      for (const item of sale.items) {
        await Product.findByIdAndUpdate(
          item.product,
          {
            $inc: {
              stockQty:
                item.qty
            }
          }
        );
      }

      await sale.deleteOne();

      return res.status(200).json({
        message:
          "Refund completed"
      });

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };

module.exports = {
  createSale,
  getSales,
  getTodaySales,
  getSaleById,
  searchSales,
  holdSale,
  getHeldSales,
  resumeHeldSale,
  deleteHeldSale,
  refundSale
};
