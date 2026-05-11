  const mongoose = require("mongoose");
const Order = require("../models/Order");
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


// PROCESS ORDER
const processOrder = async (
  ownerId,
  branchId,
  text
) => {
  const cleanText =
    cleanOCRText(text);

  const items =
    parseOrderText(cleanText);

  if (!items.length) {
    throw new Error(
      "No items detected"
    );
  }

  const result =
    await analyzeProfit(
      ownerId,
      branchId,
      items
    );

  let order = null;

  try {
    order =
      await Order.create({
        owner: ownerId,
        branch: branchId,
        rawText: cleanText,
        items:
          result.items,
        buyTotal:
          result.buyTotal,
        sellTotal:
          result.sellTotal,
        totalProfit:
          result.totalProfit
      });

  } catch (dbError) {
    console.log(
      "ORDER SAVE ERROR:",
      dbError
    );
  }

  return {
    order,
    cleanText,
    result
  };
};


// SCAN ORDER TEXT
const scanOrder = async (
  req,
  res
) => {
  try {
    const { text } =
      req.body;

    if (!text) {
      return res.status(400).json({
        message:
          "Text required"
      });
    }

    const {
      order,
      cleanText,
      result
    } =
      await processOrder(
        req.ownerId,
        req.branchId,
        text
      );

    return res.status(200).json({
      orderId:
        order?._id || null,
      rawText:
        cleanText,
      ...result
    });

  } catch (error) {
    console.log(
      "SCAN ORDER ERROR:",
      error
    );

    return res.status(400).json({
      message:
        error.message ||
        "Scan failed"
    });
  }
};


// SCAN IMAGE
const scanImage = async (
  req,
  res
) => {
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

    const {
      order,
      cleanText,
      result
    } =
      await processOrder(
        req.ownerId,
        req.branchId,
        text
      );

    return res.status(200).json({
      orderId:
        order?._id || null,
      rawText:
        cleanText,
      ...result
    });

  } catch (error) {
    console.log(
      "SCAN IMAGE ERROR:",
      error
    );

    return res.status(400).json({
      message:
        error.message ||
        "Scan failed"
    });
  }
};


// GET HISTORY
const getOrderHistory =
  async (req, res) => {
    try {
      const page =
        Math.max(
          0,
          Number(
            req.query.page
          ) || 0
        );

      const limit = 20;
      const skip =
        page * limit;

      const orders =
        await Order.find({
          owner:
            req.ownerId,
          branch:
            req.branchId
        })
          .sort({
            createdAt: -1
          })
          .limit(limit)
          .skip(skip)
          .select(
            "_id buyTotal sellTotal totalProfit createdAt"
          )
          .lean();

      return res.status(200).json(
        orders
      );

    } catch (error) {
      return res.status(500).json({
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
          owner:
            req.ownerId,
          branch:
            req.branchId
        }).lean();

      if (!order) {
        return res.status(404).json({
          message:
            "Order not found"
        });
      }

      return res.status(200).json(
        order
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// PROFIT SUMMARY
const getOrderProfitSummary =
  async (req, res) => {
    try {
      const ownerId =
        req.ownerId;

      const branchId =
        req.branchId;

      const today =
        new Date();

      today.setHours(
        0,
        0,
        0,
        0
      );

      const tomorrow =
        new Date(today);

      tomorrow.setDate(
        tomorrow.getDate() + 1
      );

      const result =
        await Order.aggregate([
          {
            $match: {
              owner:
                new mongoose.Types.ObjectId(
                  ownerId
                ),
              branch:
                new mongoose.Types.ObjectId(
                  branchId
                )
            }
          },
          {
            $group: {
              _id: null,
              totalOrderProfit:
                {
                  $sum:
                    "$totalProfit"
                },
              totalBuy: {
                $sum:
                  "$buyTotal"
              },
              totalSell: {
                $sum:
                  "$sellTotal"
              },
              count: {
                $sum: 1
              }
            }
          }
        ]);

      const todayAgg =
        await Order.aggregate([
          {
            $match: {
              owner:
                new mongoose.Types.ObjectId(
                  ownerId
                ),
              branch:
                new mongoose.Types.ObjectId(
                  branchId
                ),
              createdAt: {
                $gte: today,
                $lt:
                  tomorrow
              }
            }
          },
          {
            $group: {
              _id: null,
              todayOrderProfit:
                {
                  $sum:
                    "$totalProfit"
                }
            }
          }
        ]);

      const data =
        result[0] || {
          totalOrderProfit:
            0,
          totalBuy: 0,
          totalSell: 0,
          count: 0
        };

      const todayData =
        todayAgg[0] || {
          todayOrderProfit:
            0
        };

      return res.status(200).json({
        ...data,
        todayOrderProfit:
          todayData.todayOrderProfit
      });

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };

module.exports = {
  scanOrder,
  scanImage,
  getOrderHistory,
  getOrderById,
  getOrderProfitSummary
};
