 const Product = require("../models/Product");
const normalizeProductName = require("../utils/normalizeProductName");

const analyzeProfit = async (
  userId,
  items,
  branchId = null
) => {
  const query = {
    user: userId,
    isActive: true,
  };

  if (branchId) {
    query.branch = branchId;
  }

  const products = await Product.find(query);

  // 🔥 BUILD MAP (ARRAY PER KEY)
  const productMap = new Map();

  products.forEach((p) => {
    const key = normalizeProductName(p.name);

    if (!productMap.has(key)) {
      productMap.set(key, []);
    }

    productMap.get(key).push(p);
  });

  let results = [];
  let buyTotal = 0;
  let sellTotal = 0;
  let totalProfit = 0;

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const clean = normalizeProductName(item.name);

    let matched = null;

    // 🔥 STEP 1: EXACT MATCH GROUP
    const candidates = productMap.get(clean);

    if (candidates && candidates.length) {
      // 🔥 CHOOSE BEST MATCH BASED ON PRICE
      matched = candidates.reduce((best, p) => {
        if (!best) return p;

        return Math.abs(p.sellPrice - item.buyPrice) <
          Math.abs(best.sellPrice - item.buyPrice)
          ? p
          : best;
      }, null);
    }

    // 🔥 STEP 2: FALLBACK PARTIAL MATCH (SMART)
    if (!matched) {
      matched = products.reduce((best, p) => {
        const pname = normalizeProductName(p.name);

        const isMatch =
          pname.includes(clean) ||
          clean.includes(pname) ||
          pname.startsWith(clean) ||
          clean.startsWith(pname);

        if (!isMatch) return best;

        if (!best) return p;

        return Math.abs(p.sellPrice - item.buyPrice) <
          Math.abs(best.sellPrice - item.buyPrice)
          ? p
          : best;
      }, null);
    }

    const qty = Number(item.qty) || 0;
    const buyPrice = Number(item.buyPrice) || 0;

    const itemBuyTotal = qty * buyPrice;
    buyTotal += itemBuyTotal;

    if (matched) {
      const sellPrice =
        Number(matched.sellPrice) || 0;

      const itemSellTotal = qty * sellPrice;

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
        qty,
        buyPrice,
        buyTotal: itemBuyTotal,
        sellPrice,
        sellTotal: itemSellTotal,
        profitEach,
        profitTotal,
        matched: true,
      });
    } else {
      unmatchedCount++;

      results.push({
        no: i + 1,
        name: item.name,
        qty,
        buyPrice,
        buyTotal: itemBuyTotal,
        sellPrice: 0,
        sellTotal: 0,
        profitEach: 0,
        profitTotal: 0,
        matched: false,
      });
    }
  }

  return {
    items: results,
    buyTotal: Math.round(buyTotal),
    sellTotal: Math.round(sellTotal),
    totalProfit: Math.round(totalProfit),
    matchedCount,
    unmatchedCount,
  };
};

module.exports = {
  analyzeProfit,
};
