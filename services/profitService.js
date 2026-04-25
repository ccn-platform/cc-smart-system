  const Product =
require("../models/Product");

const normalizeProductName =
require("../utils/normalizeProductName");

const analyzeProfit =
async (
  userId,
  items,
  branchId = null
) => {
  const query = {
    user: userId,
    isActive: true
  };

  if (branchId) {
    query.branch =
      branchId;
  }

  const products =
    await Product.find(
      query
    );

  let results = [];

  let totalProfit = 0;
  let buyTotal = 0;
  let sellTotal = 0;

  let matchedCount = 0;
  let unmatchedCount = 0;

  for (
    let i = 0;
    i < items.length;
    i++
  ) {
    const item =
      items[i];

    const clean =
      normalizeProductName(
        item.name
      );

    const matched =
      products.find(
        (p) => {
          const pname =
            normalizeProductName(
              p.name
            );

          return (
            pname.includes(
              clean
            ) ||
            clean.includes(
              pname
            )
          );
        }
      );

    const itemBuyTotal =
      item.buyPrice *
      item.qty;

    buyTotal +=
      itemBuyTotal;

    if (matched) {
      const sellPrice =
        matched.sellPrice;

      const itemSellTotal =
        sellPrice *
        item.qty;

      const profitEach =
        Math.max(
          0,
          sellPrice -
            item.buyPrice
        );

      const profitTotal =
        profitEach *
        item.qty;

      sellTotal +=
        itemSellTotal;

      totalProfit +=
        profitTotal;

      matchedCount++;

      results.push({
        no: i + 1,
        name:
          item.name,
        qty:
          item.qty,
        buyPrice:
          item.buyPrice,
        buyTotal:
          itemBuyTotal,
        sellPrice,
        sellTotal:
          itemSellTotal,
        profitEach,
        profitTotal,
        matched: true
      });
    } else {
      unmatchedCount++;

      results.push({
        no: i + 1,
        name:
          item.name,
        qty:
          item.qty,
        buyPrice:
          item.buyPrice,
        buyTotal:
          itemBuyTotal,
        sellPrice: 0,
        sellTotal: 0,
        profitEach: 0,
        profitTotal: 0,
        matched: false
      });
    }
  }

  return {
    items: results,
    buyTotal,
    sellTotal,
    totalProfit,
    matchedCount,
    unmatchedCount
  };
};

module.exports = {
  analyzeProfit
};