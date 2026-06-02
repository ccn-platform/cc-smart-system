  const mongoose = require("mongoose");
const Order = require("../models/Order");
const cleanOCRText = require("../utils/cleanOCRText");
const parseOrderText = require("../utils/parseOrderText");
const { analyzeProfit } = require("../services/profitService");
const { readImageText } = require("../services/ocrService");

const BAD_REQUEST_ERRORS = [
  "Text required",
  "Image required",
  "No items detected",
  "No file provided",
  "Image too large (max 5MB)",
  "Invalid file (no buffer/path)"
];

const SUMMARY_CACHE_TTL = 30000;
const summaryCache = new Map();

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

  return {
    cleanText,
    result
  };
};

const invalidateSummaryCache = (
  ownerId,
  branchId
) => {
  const key =
    `${ownerId}:${branchId}`;

  summaryCache.delete(key);
};


// SCAN ORDER TEXT
const scanOrder = async (
  req,
  res
) => {
  try {
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({
        message:
          "Text required"
      });
    }

    const {
      cleanText,
      result
    } = await processOrder(
      req.ownerId,
      req.branchId,
      text
    );

    res.status(200).json({
      rawText:
        cleanText.slice(
          0,
          10000
        ),
      ...result
    });

  } catch (error) {
    const status =
      BAD_REQUEST_ERRORS.includes(
        error.message
      )
        ? 400
        : 500;

    res.status(status).json({
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
      cleanText,
      result
    } = await processOrder(
      req.ownerId,
      req.branchId,
      text
    );

    res.status(200).json({
      rawText:
        cleanText.slice(
          0,
          10000
        ),
      ...result
    });

  } catch (error) {
    const status =
      BAD_REQUEST_ERRORS.includes(
        error.message
      )
        ? 400
        : 500;

    res.status(status).json({
      message:
        error.message ||
        "Scan failed"
    });
  }
};


const confirmOrder = async (
  req,
  res
) => {
  try {
    const {
      items,
      rawText = ""
    } = req.body;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "Items required"
      });
    }

    const result =
      await analyzeProfit(
        req.ownerId,
        req.branchId,
        items
      );

    const finalItems =
      result.items.map(
        (
          item,
          index
        ) => {
          const original =
            items[index];

          if (
            !item.matched &&
            Number(
              original?.sellPrice
            ) > 0
          ) {
            const sellPrice =
              Number(
                original.sellPrice
              );

            const profitEach =
              sellPrice -
              item.buyPrice;

            const profitTotal =
              profitEach *
              item.qty;

            return {
              ...item,
              sellPrice,
              profitEach,
              profitTotal,
              matched: true,
              reason:
                "manual_sell_price"
            };
          }

          return item;
        }
      );

    const buyTotal =
      finalItems.reduce(
        (
          sum,
          x
        ) =>
          sum +
          (x.buyPrice || 0) *
            (x.qty || 0),
        0
      );

    const sellTotal =
      finalItems.reduce(
        (
          sum,
          x
        ) =>
          sum +
          (x.sellPrice || 0) *
            (x.qty || 0),
        0
      );

    const totalProfit =
      finalItems.reduce(
        (
          sum,
          x
        ) =>
          sum +
          (x.profitTotal || 0),
        0
      );

    const order =
      await Order.create({
        owner: req.ownerId,
        branch:
          req.branchId,
        rawText:
          String(
            rawText
          ).slice(
            0,
            50000
          ),

        items:
          finalItems.map(
            (x) => ({
              name:
                x.name ||
                "Unknown",
              qty:
                x.qty || 0,
              buyPrice:
                x.buyPrice ||
                0,
              sellPrice:
                x.sellPrice ||
                0,
              profitEach:
                x.profitEach ||
                0,
              profitTotal:
                x.profitTotal ||
                0,
              matched:
                x.matched ||
                false
            })
          ),

        buyTotal,
        sellTotal,
        totalProfit
      });

    invalidateSummaryCache(
      req.ownerId,
      req.branchId
    );

    res.status(200).json({
      message:
        "Order saved",
      orderId:
        order._id,
      items:
        finalItems,
      buyTotal,
      sellTotal,
      totalProfit
    });

  } catch (error) {
    res.status(500).json({
      message:
        error.message ||
        "Confirm failed"
    });
  }
};

 // HISTORY
const getOrderHistory = async (
  req,
  res
) => {
  try {
    const limit = 20;

    const cursor =
      req.query.cursor;

    const page = Math.min(
      1000,
      Math.max(
        0,
        Number(req.query.page) || 0
      )
    );

    const period =
      req.query.period ||
      "today";

    const now =
      new Date();

    let start;
    let end =
      new Date(now);

    // mwisho wa siku
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

        start.setHours(
          0,
          0,
          0,
          0
        );

        {
          const day =
            start.getDay();

          const diff =
            day === 0
              ? 6
              : day - 1;

          start.setDate(
            start.getDate() -
              diff
          );
        }
        break;

      case "month":
        start =
          new Date(
            now.getFullYear(),
            now.getMonth(),
            1,
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
    console.log(
      "Order History Query:",
      {
        owner:
          req.ownerId,
        branch:
          req.branchId,
        period,
        start,
        end
      }
    );

    let dbQuery =
      Order.find(query)
        .select(
          "_id buyTotal sellTotal totalProfit createdAt"
        )
        .lean();

    if (
      cursor &&
      mongoose.Types.ObjectId.isValid(
        cursor
      )
    ) {
      dbQuery = dbQuery
        .find({
          _id: {
            $lt: cursor
          }
        })
        .sort({
          _id: -1
        })
        .limit(limit);
    } else {
      dbQuery = dbQuery
        .sort({
          createdAt: -1
        })
        .skip(page * limit)
        .limit(limit);
    }

    const orders =
      await dbQuery;

    console.log(
      `Orders found: ${orders.length}`
    );

    res.status(200).json(
      orders
    );

  } catch (error) {
    console.error(
      "getOrderHistory error:",
      error
    );

    res.status(500).json({
      message:
        error.message ||
        "Failed to load history"
    });
  }
};
const deleteOrder = async (
  req,
  res
) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        message:
          "Invalid order id"
      });
    }

    const order =
      await Order.findOne({
        _id:
          req.params.id,
        owner:
          req.ownerId,
        branch:
          req.branchId
      });

    if (!order) {
      return res.status(404).json({
        message:
          "Order not found"
      });
    }

    await order.deleteOne();

    summaryCache.clear();

    res.status(200).json({
      message:
        "Order deleted"
    });

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

// SINGLE ORDER
const getOrderById =
  async (
    req,
    res
  ) => {
    try {
      if (
        !mongoose.Types.ObjectId.isValid(
          req.params.id
        )
      ) {
        return res.status(400).json({
          message:
            "Invalid order id"
        });
      }

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


 const getOrderProfitSummary =
  async (
    req,
    res
  ) => {
    try {
      const period =
        req.query.period ||
        "today";

      const cacheKey =
        `${req.ownerId}:${req.branchId}:${period}`;

      const cached =
        summaryCache.get(
          cacheKey
        );

      if (
        cached &&
        Date.now() -
          cached.timestamp <
          SUMMARY_CACHE_TTL
      ) {
        return res.status(200).json(
          cached.data
        );
      }

      const ownerId =
        new mongoose.Types.ObjectId(
          req.ownerId
        );

      const branchId =
        new mongoose.Types.ObjectId(
          req.branchId
        );

      let start =
        new Date();

      const end =
        new Date();

      if (
        period ===
        "today"
      ) {
        start =
          new Date();

        start.setHours(
          0,
          0,
          0,
          0
        );
      }

      if (
        period ===
        "week"
      ) {
        start =
          new Date();

        start.setHours(
          0,
          0,
          0,
          0
        );

        const day =
          start.getDay();

        const diff =
          day === 0
            ? 6
            : day - 1;

        start.setDate(
          start.getDate() -
            diff
        );
      }

      if (
        period ===
        "month"
      ) {
        start =
          new Date(
            end.getFullYear(),
            end.getMonth(),
            1
          );
      }

      const result =
        await Order.aggregate([
          {
            $match: {
              owner:
                ownerId,
              branch:
                branchId,
              createdAt: {
                $gte: start,
                $lte: end
              }
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

      const data =
        result[0] || {
          totalOrderProfit: 0,
          totalBuy: 0,
          totalSell: 0,
          count: 0
        };

      summaryCache.set(
        cacheKey,
        {
          data,
          timestamp:
            Date.now()
        }
      );

      res.status(200).json(
        data
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
  deleteOrder,
  getOrderHistory,
  getOrderById,
  confirmOrder,
  getOrderProfitSummary
};
