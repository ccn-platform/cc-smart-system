  const Product = require("../models/Product");
const normalizeProductName =
  require("../utils/normalizeProductName");
const stringSimilarity =
  require("string-similarity");

const escapeRegex = (text) =>
  text.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );

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

  // STEP 1: normalize all valid names
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
        clean,
      };
    }
  );

  // STEP 2: collect unique valid names
  const uniqueNames = [
    ...new Set(
      normalizedItems
        .filter(
          (x) =>
            x.clean &&
            x.clean.length >= 2
        )
        .map((x) => x.clean)
    ),
  ];

  // STEP 3: batch database lookup (ONE QUERY)
  let products = [];
let candidateProducts = [];

if (uniqueNames.length > 0) {
  const baseQuery = {
    owner: userId,
    isActive: true,
  };

  if (branchId) {
    baseQuery.branch = branchId;
  }

  // exact matches
  products =
    await Product.find({
      ...baseQuery,
      normalizedName: {
        $in: uniqueNames,
      },
    })
      .select(
        "normalizedName sellPrice name"
      )
      .lean();

  // candidate pool for fuzzy matching
  const searchWords = [
  ...new Set(
    uniqueNames
      .flatMap((name) =>
        name.split(" ")
      )
      .filter(
        (word) => word.length >= 3
      )
      .slice(0, 30)
  ),
];

if (searchWords.length > 0) {
 candidateProducts =
  await Product.find({
    ...baseQuery,
    $or: searchWords.map((w) => ({
      normalizedName: {
         $regex: escapeRegex(w),
        $options: "i",
      },
    })),
  })
    .select(
      "normalizedName sellPrice name"
    )
    .limit(500)
    .lean();
}
}
  // STEP 4: fast lookup map
  const productMap = new Map();

  for (const product of products) {
    productMap.set(
      product.normalizedName,
      product
    );
  }

  const candidateNames =
  candidateProducts.map(
    (p) => p.normalizedName
  );

  const candidateMap = new Map();

for (const product of candidateProducts) {
  candidateMap.set(
    product.normalizedName,
    product
  );
}
const fuzzyResultCache = new Map();

  // STEP 5: calculate results
  for (const row of normalizedItems) {
    const {
      index,
      original,
      qty,
      buyPrice,
      clean,
    } = row;

    const itemBuyTotal =
      qty * buyPrice;

    buyTotal += itemBuyTotal;

    // invalid name
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
        reason: "invalid_name",
      });

      continue;
    }
let matched =
  productMap.get(clean);

// exact match failed → fuzzy match
 if (
  !matched &&
  candidateProducts.length > 0 &&
  clean.length >= 8
) {
  if (fuzzyResultCache.has(clean)) {
    matched =
      fuzzyResultCache.get(clean);
  } else {
    const best =
      stringSimilarity
        .findBestMatch(
          clean,
          candidateNames
        );

    const topMatches =
      best.ratings.filter(
        (r) => r.rating >= 0.9
      );

    if (topMatches.length === 1) {
      matched =
        candidateMap.get(
          best.bestMatch.target
        );
    }

    fuzzyResultCache.set(
      clean,
      matched || null
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
        matched: true,
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
