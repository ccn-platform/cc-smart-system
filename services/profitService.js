  const Product = require("../models/Product");

const normalizeProductName =
  require("../utils/normalizeProductName");

// 🔥 MEMORY CACHE
const learnedMap = new Map();

const analyzeProfit = async (
  userId,
  items,
  branchId = null
) => {
  let results = [];

  let buyTotal = 0;
  let sellTotal = 0;
  let totalProfit = 0;

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const qty =
      Math.max(Number(item.qty) || 0, 0);

    const buyPrice =
      Math.max(Number(item.buyPrice) || 0, 0);

    // 🔥 NORMALIZE OCR NAME
    const clean =
      normalizeProductName(item.name || "");

    if (!clean || clean.length < 2) {
      continue;
    }

    let matched = null;

    // ✅ CACHE MATCH
    if (learnedMap.has(clean)) {
      matched = learnedMap.get(clean);
    }

    // ✅ INDEXED DATABASE MATCH
    if (!matched) {
      const query = {
        owner: userId,
        normalizedName: clean,
        isActive: true,
      };

      // 🔥 OPTIONAL BRANCH FILTER
      if (branchId) {
        query.branch = branchId;
      }

      matched =
        await Product.findOne(query).lean();

      // 🔥 SAVE CACHE
      if (matched) {
        learnedMap.set(clean, matched);
      }
    }

    const itemBuyTotal =
      qty * buyPrice;

    buyTotal += itemBuyTotal;

    // ✅ MATCHED PRODUCT
    if (matched) {
      const sellPrice =
        Number(matched.sellPrice) || 0;

      const itemSellTotal =
        qty * sellPrice;

      const profitEach =
        sellPrice - buyPrice;

      const profitTotal =
        profitEach * qty;

      sellTotal += itemSellTotal;

      totalProfit += profitTotal;

      matchedCount++;

      results.push({
        no: i + 1,
        name: item.name,

        normalizedName: clean,

        qty,

        buyPrice,

        buyTotal: itemBuyTotal,

        sellPrice,

        sellTotal: itemSellTotal,

        profitEach,

        profitTotal,

        matched: true,
      });
    }

    // ❌ NOT MATCHED
    else {
      unmatchedCount++;

      results.push({
        no: i + 1,

        name: item.name,

        normalizedName: clean,

        qty,

        buyPrice,

        buyTotal: itemBuyTotal,

        sellPrice: 0,

        sellTotal: 0,

        profitEach: 0,

        profitTotal: 0,

        matched: false,

        reason: "not_matched",
      });
    }
  }

  return {
    items: results,

    buyTotal:
      Math.round(buyTotal),

    sellTotal:
      Math.round(sellTotal),

    totalProfit:
      Math.round(totalProfit),

    matchedCount,

    unmatchedCount,
  };
};

module.exports = {
  analyzeProfit,
};
