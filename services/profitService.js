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

  // 🔥 FAST EXACT MATCH MAP
  const productMap = new Map();

  products.forEach((p) => {
    const key = normalizeProductName(p.name);

    if (!productMap.has(key)) {
      productMap.set(key, []);
    }

    productMap.get(key).push(p);
  });

  // 🔥 PREPROCESS FOR PARTIAL MATCH
  const productList = products.map((p) => ({
    raw: p,
    name: normalizeProductName(p.name),
  }));

  let results = [];
  let buyTotal = 0;
  let sellTotal = 0;
  let totalProfit = 0;

  let matchedCount = 0;
  let unmatchedCount = 0;

  // 🔥 SMART NAME MATCH
  const isSimilar = (a, b) => {
    if (!a || !b) return false;

    a = a.trim();
    b = b.trim();

    return (
      a === b ||
      a.includes(b) ||
      b.includes(a) ||
      a.startsWith(b.slice(0, 4)) ||
      b.startsWith(a.slice(0, 4))
    );
  };

  // 🔥 MAIN LOOP
  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const qty = Math.max(Number(item.qty) || 0, 0);
    const buyPrice = Math.max(Number(item.buyPrice) || 0, 0);

    const clean = normalizeProductName(item.name);

    if (!clean || clean.length < 3) {
      console.log("SKIPPED:", item.name);
      continue;
    }

    let matched = null;

    // ✅ STEP 1: EXACT MATCH (BEST)
    const candidates = productMap.get(clean);

    if (candidates && candidates.length) {
      matched = candidates[0];
    }

    // ✅ STEP 2: PARTIAL MATCH (SMART)
    if (!matched) {
      let best = null;

      for (const p of productList) {
        if (!isSimilar(p.name, clean)) continue;

        if (!best) {
          best = p.raw;
          continue;
        }

        // 🔥 chagua jina refu zaidi (more specific)
        if (
          p.name.length >
          normalizeProductName(best.name).length
        ) {
          best = p.raw;
        }
      }

      if (best) {
        matched = best;
      }
    }

    // 🔥 DEBUG (MUHIMU SANA)
    console.log("DEBUG:", {
      input: item.name,
      normalized: clean,
      matched: matched?.name || "NOT FOUND",
      buyPrice,
      sellPrice: matched?.sellPrice || 0,
    });

    // 🔥 CALCULATIONS
    const itemBuyTotal = qty * buyPrice;
    buyTotal += itemBuyTotal;

    if (matched) {
      const sellPrice = Number(matched.sellPrice) || 0;

      const itemSellTotal = qty * sellPrice;
      const profitEach = sellPrice - buyPrice;
      const profitTotal = profitEach * qty;

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

  // ✅ FINAL RETURN
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
