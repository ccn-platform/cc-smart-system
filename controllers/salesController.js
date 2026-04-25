const Sale = require("../models/Sale");
const Product = require("../models/Product");

const calculateProfit = require("../utils/calculateprofit");
const generateReceipt = require("../utils/generateReceipt");


// CREATE SALE
const createSale = async (
  req,
  res
) => {
  try {
    const {
      items,
      paymentMethod
    } = req.body;

    if (
      !items ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "Cart is empty"
      });
    }

    let saleItems = [];
    let totalAmount = 0;
    let totalProfit = 0;

    for (const item of items) {
      const product =
        await Product.findOne({
          _id: item.productId,
          user: req.user.id,
          isActive: true
        });

      if (!product) {
        return res.status(404).json({
          message:
            `${item.name} not found`
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

      // reduce stock
      product.stockQty =
        product.stockQty -
        item.qty;

      await product.save();
    }

    const receiptNo =
      generateReceipt();

    const sale =
      await Sale.create({
        user: req.user.id,
        items: saleItems,
        totalAmount,
        totalProfit,
        paymentMethod,
        receiptNo
      });

    res.status(201).json(
      sale
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// GET SALES
const getSales = async (
  req,
  res
) => {
  try {
    const sales =
      await Sale.find({
        user: req.user.id
      }).sort({
        createdAt: -1
      });

    res.status(200).json(
      sales
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// TODAY SALES SUMMARY
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
          user: req.user.id,
          createdAt: {
            $gte: start
          }
        });

      let total = 0;

      for (const s of sales) {
        total +=
          s.totalAmount;
      }

      res.status(200).json({
        count:
          sales.length,
        total
      });
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };


module.exports = {
  createSale,
  getSales,
  getTodaySales
};