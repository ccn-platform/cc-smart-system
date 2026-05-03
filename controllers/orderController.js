const mongoose = require("mongoose");
 const Order = require("../models/Order");
const cleanOCRText = require("../utils/cleanOCRText");
const parseOrderText = require("../utils/parseOrderText");
const { analyzeProfit } = require("../services/profitService");
const { readImageText } = require("../services/ocrService");


// 🔥 HELPER (avoid duplicate logic)
const processOrder = async (userId, text) => {
  const cleanText = cleanOCRText(text);
  const items = parseOrderText(cleanText);

  if (!items.length) {
    throw new Error("No items detected");
  }

  const result = await analyzeProfit(userId, items);

  const order = await Order.create({
    user: userId,
    rawText: cleanText,
    items: result.items,
    buyTotal: result.buyTotal,
    sellTotal: result.sellTotal,
    totalProfit: result.totalProfit
  });

  return { order, cleanText, result };
};


// SCAN ORDER TEXT
const scanOrder = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        message: "Text required"
      });
    }

    const { order, cleanText, result } =
      await processOrder(req.user.id, text);

    res.status(200).json({
      orderId: order._id,
      rawText: cleanText,
      ...result
    });

  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};


// SCAN IMAGE
const scanImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "Image required"
      });
    }

    const text = await readImageText(req.file);

    const { order, cleanText, result } =
      await processOrder(req.user.id, text);

    res.status(200).json({
      orderId: order._id,
      rawText: cleanText,
      ...result
    });

  } catch (error) {
    res.status(400).json({
      message: error.message
    });
  }
};


// GET HISTORY (PAGINATION)
const getOrderHistory = async (req, res) => {
  try {
    const page = Math.max(0, Number(req.query.page) || 0);
    const limit = 20;
    const skip = page * limit;

    const orders = await Order.find({
      user: req.user.id
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .select("_id buyTotal sellTotal totalProfit createdAt")
      .lean(); // 🔥 performance boost

    res.status(200).json(orders);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};


// GET SINGLE ORDER
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user.id
    }).lean(); // 🔥 faster read

    if (!order) {
      return res.status(404).json({
        message: "Order not found"
      });
    }

    res.status(200).json(order);

  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

// 🔥 ORDER PROFIT SUMMARY
 

const getOrderProfitSummary = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const result = await Order.aggregate([
      {
        $match: {
          user: userId
        }
      },
      {
        $group: {
          _id: null,
          totalOrderProfit: { $sum: "$totalProfit" },
          totalBuy: { $sum: "$buyTotal" },
          totalSell: { $sum: "$sellTotal" },
          count: { $sum: 1 }
        }
      }
    ]);

    const data = result[0] || {
      totalOrderProfit: 0,
      totalBuy: 0,
      totalSell: 0,
      count: 0
    };

    res.status(200).json(data);

  } catch (error) {
    console.log("❌ PROFIT ERROR:", error);
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  scanOrder,
  scanImage,
  getOrderHistory,
  getOrderById,
   getOrderProfitSummary // 🔥 ADD THIS
};
