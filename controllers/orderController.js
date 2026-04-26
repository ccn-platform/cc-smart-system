  const Order =
require("../models/Order");

const cleanOCRText =
require("../utils/cleanOCRText");

const parseOrderText =
require("../utils/parseOrderText");

const {
  analyzeProfit
} = require("../services/profitService");

const {
  readImageText
} = require("../services/ocrService");


// SCAN ORDER TEXT
const scanOrder =
async (req, res) => {
  try {
    const { text } =
      req.body;

    if (!text) {
      return res.status(400).json({
        message:
          "Text required"
      });
    }

    const cleanText =
      cleanOCRText(text);

    const items =
      parseOrderText(
        cleanText
      );

    if (
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "No items detected"
      });
    }

    const result =
      await analyzeProfit(
        req.user.id,
        items
      );

    const order =
      await Order.create({
        user:
          req.user.id,
        rawText:
          cleanText,
        items:
          result.items,
        buyTotal:
          result.buyTotal,
        sellTotal:
          result.sellTotal,
        totalProfit:
          result.totalProfit
      });

    res.status(200).json({
      orderId:
        order._id,
      rawText:
        cleanText,
      ...result
    });

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// SCAN IMAGE
const scanImage =
async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        message:
          "Image required"
      });
    }

    const text =
      await readImageText(
        req.file
      );

    const cleanText =
      cleanOCRText(text);

    const items =
      parseOrderText(
        cleanText
      );

    if (
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "No items detected"
      });
    }

    const result =
      await analyzeProfit(
        req.user.id,
        items
      );

    const order =
      await Order.create({
        user:
          req.user.id,
        rawText:
          cleanText,
        items:
          result.items,
        buyTotal:
          result.buyTotal,
        sellTotal:
          result.sellTotal,
        totalProfit:
          result.totalProfit
      });

    res.status(200).json({
      orderId:
        order._id,
      rawText:
        cleanText,
      ...result
    });

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// GET HISTORY
const getOrderHistory =
async (req, res) => {
  try {
    const orders =
      await Order.find({
        user:
          req.user.id
      })
      .sort({
        createdAt: -1
      })
      .select(
        "_id buyTotal sellTotal totalProfit createdAt"
      );

    res.status(200).json(
      orders
    );

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// GET SINGLE ORDER
const getOrderById =
async (req, res) => {
  try {
    const order =
      await Order.findOne({
        _id:
          req.params.id,
        user:
          req.user.id
      });

    if (!order) {
      return res.status(404).json({
        message:
          "Order not found"
      });
    }

    res.status(200).json(
      order
    );

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

module.exports = {
  scanOrder,
  scanImage,
  getOrderHistory,
  getOrderById
};
