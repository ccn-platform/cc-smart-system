  const Product = require("../models/Product");
const normalizeProductName = require("../utils/normalizeProductName");

// 🔥 CONFIG
const MATCH_THRESHOLD = 0.88;
const BRAND_THRESHOLD = 0.75;
const DEBUG = false; // 🔥 badilisha true ukitaka logs

const learnedMap = new Map();

// 🔥 SAFE BRAND
 const extractBrand = (name = "") => {
  const words = name.split(" ");

  return (
    words.find(w => w.length >= 2 && w.length <= 6) ||
    words[0] ||
    ""
  );
};

// 🔥 LEVENSHTEIN
const levenshtein = (a, b) => {
  const matrix = [];

  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b[i - 1] === a[j - 1]
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
    }
  }

  return matrix[b.length][a.length];
};

// 🔥 SIMILARITY
const similarity = (a, b) => {
  if (!a || !b) return 0;

  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;

  if (!longer.length) return 1;

  return (
    (longer.length - levenshtein(longer, shorter)) /
    longer.length
  );
};

const analyzeProfit = async (userId, items, branchId = null) => {
  const query = { user: userId, isActive: true };
  if (branchId) query.branch = branchId;

  const products = await Product.find(query);

  const productMap = new Map();
  const brandMap = new Map();

  // 🔥 PREPROCESS
  const productList = products.map((p) => {
    const name = normalizeProductName(p.name || "");
    const brand = extractBrand(name);

    if (!productMap.has(name)) productMap.set(name, []);
    productMap.get(name).push(p);

    if (!brandMap.has(brand)) brandMap.set(brand, []);
    brandMap.get(brand).push({ raw: p, name });

    return { raw: p, name, brand };
  });

  let results = [];
  let buyTotal = 0;
  let sellTotal = 0;
  let totalProfit = 0;

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    const qty = Math.max(Number(item.qty) || 0, 0);
    const buyPrice = Math.max(Number(item.buyPrice) || 0, 0);

    const clean = normalizeProductName(item.name || "");
    if (!clean || clean.length < 3) continue;

    let matched = null;

    // ✅ 1. CACHE (FASTEST)
    if (learnedMap.has(clean)) {
      matched = learnedMap.get(clean);
    }

    // ✅ 2. EXACT
    if (!matched) {
      const candidates = productMap.get(clean);
      if (candidates?.length) matched = candidates[0];
    }

    // ✅ 3. BRAND FILTER
    if (!matched) {
      const brand = extractBrand(clean);
      const brandProducts = brandMap.get(brand) || [];

      let best = null;
      let bestScore = 0;

      for (const p of brandProducts) {
        const score = similarity(p.name, clean);

        if (score > bestScore) {
          bestScore = score;
          best = p.raw;
        }
      }

      if (best && bestScore >= BRAND_THRESHOLD) {
        matched = best;
        learnedMap.set(clean, best);
      }
    }

    
    
   // ✅ GLOBAL MATCH (STRICT 88%)
if (!matched) {
  let best = null;
  let bestScore = 0;

  for (const p of productList) {
    const score = similarity(p.name, clean);

    if (score > bestScore) {
      bestScore = score;
      best = p.raw;
    }
  }

  // 🔥 HAPA NDIO RULE YAKO HALISI
  if (best && bestScore >= MATCH_THRESHOLD) {
    matched = best;
    learnedMap.set(clean, best);
  }

  // 🔥 DEBUG (MUHIMU)
  console.log("SIMILARITY RESULT:", {
    input: item.name,
    normalized: clean,
    bestMatch: best?.name,
    score: bestScore,
    accepted: bestScore >= MATCH_THRESHOLD
  });
}

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
  reason: "not_matched", // 🔥 HAPA NDIPO UNAONGEZA
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

module.exports = { analyzeProfit };
