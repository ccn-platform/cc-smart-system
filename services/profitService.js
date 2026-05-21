 const Product = require("../models/Product");
const normalizeProductName =
  require("../utils/normalizeProductName");
const stringSimilarity =
  require("string-similarity");

const EXACT_CACHE_TTL = 60000;

const exactCache = new Map();
const fuzzyCache = new Map();

const escapeRegex = (text) =>
  text.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

const getExactCacheKey = (
  userId,
  branchId,
  names
) =>
  `${userId}:${branchId}:${names.sort().join("|")}`;

const getCached = (
  cache,
  key,
  ttl
) => {
  const item = cache.get(key);

  if (
    item &&
    Date.now() - item.timestamp < ttl
  ) {
    return item.data;
  }

  return null;
};

const setCached = (
  cache,
  key,
  data
) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
};

const analyzeProfit = async (
  userId,
  branchId,
  items
) => {
  let results = [];
  let buyTotal = 0;
  let sellTotal = 0;
  let totalProfit = 0;
  let matchedCount = 0;
  let unmatchedCount = 0;

  const normalizedItems = items.map(
    (item, index) => {
      const qty =
        Math.max(
          Number(item.qty) || 0,
          0
        );

      const buyPrice =
        Math.max(
          Number(item.buyPrice) || 0,
          0
        );

      const clean =
        normalizeProductName(
          item.name || ""
        );

      return {
        index,
        original: item,
        qty,
        buyPrice,
        clean
      };
    }
  );

  const uniqueNames = [
    ...new Set(
      normalizedItems
        .filter(
          (x) =>
            x.clean &&
            x.clean.length >= 2
        )
        .map((x) => x.clean)
    )
  ];

  const baseQuery = {
    owner: userId,
    branch: branchId,
    isActive: true
  };

  // EXACT CACHE
  const exactCacheKey =
    getExactCacheKey(
      userId,
      branchId,
      [...uniqueNames]
    );

  let exactProducts =
    getCached(
      exactCache,
      exactCacheKey,
      EXACT_CACHE_TTL
    );

  if (!exactProducts) {
    exactProducts =
      await Product.find({
        ...baseQuery,
        normalizedName: {
          $in: uniqueNames
        }
      })
        .select(
          "normalizedName sellPrice name"
        )
        .lean();

    setCached(
      exactCache,
      exactCacheKey,
      exactProducts
    );
  }

  const productMap = new Map();

  for (const p of exactProducts) {
    productMap.set(
      p.normalizedName,
      p
    );
  }

  // SMALL candidate pool only
  const searchWords = [
    ...new Set(
      uniqueNames
        .flatMap((x) =>
          x.split(" ")
        )
        .filter(
          (w) => w.length >= 4
        )
        .slice(0, 10)
    )
  ];

  let candidateProducts = [];

  if (searchWords.length > 0) {
    candidateProducts =
      await Product.find({
        ...baseQuery,
        $or: searchWords.map(
          (w) => ({
            normalizedName: {
              $regex:
                escapeRegex(w),
              $options: "i"
            }
          })
        )
      })
        .select(
          "normalizedName sellPrice name"
        )
        .limit(100)
        .lean();
  }

  const candidateMap = new Map();

  for (const p of candidateProducts) {
    candidateMap.set(
      p.normalizedName,
      p
    );
  }

  const candidateNames =
    candidateProducts.map(
      (x) => x.normalizedName
    );

  for (const row of normalizedItems) {
    const {
      index,
      original,
      qty,
      buyPrice,
      clean
    } = row;

    const itemBuyTotal =
      qty * buyPrice;

    buyTotal += itemBuyTotal;

    if (!clean || clean.length < 2) {
      unmatchedCount++;

      results.push({
        no: index + 1,
        name: original.name || "",
        normalizedName: clean,
        qty,
        buyPrice,
        buyTotal: itemBuyTotal,
        sellPrice: 0,
        sellTotal: 0,
        profitEach: 0,
        profitTotal: 0,
        matched: false,
        reason: "invalid_name"
      });

      continue;
    }

    let matched =
      productMap.get(clean);

    if (
      !matched &&
      clean.length >= 8 &&
      candidateNames.length > 0
    ) {
      const fuzzyKey =
        `${userId}:${branchId}:${clean}`;

      matched =
        fuzzyCache.get(
          fuzzyKey
        );

      if (
        matched === undefined
      ) {
        const best =
          stringSimilarity.findBestMatch(
            clean,
            candidateNames
          );

        if (
          best.bestMatch.rating >=
          0.92
        ) {
          matched =
            candidateMap.get(
              best.bestMatch.target
            );
        } else {
          matched = null;
        }

        fuzzyCache.set(
          fuzzyKey,
          matched
        );
      }
    }

    if (matched) {
      const sellPrice =
        Number(
          matched.sellPrice
        ) || 0;

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
        no: index + 1,
        name: original.name,
        normalizedName: clean,
        qty,
        buyPrice,
        buyTotal: itemBuyTotal,
        sellPrice,
        sellTotal: itemSellTotal,
        profitEach,
        profitTotal,
        matched: true
      });
    } else {
      unmatchedCount++;

      results.push({
        no: index + 1,
        name: original.name,
        normalizedName: clean,
        qty,
        buyPrice,
        buyTotal: itemBuyTotal,
        sellPrice: 0,
        sellTotal: 0,
        profitEach: 0,
        profitTotal: 0,
        matched: false,
        reason: "not_matched"
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
    unmatchedCount
  };
};

module.exports = {
  analyzeProfit
};
