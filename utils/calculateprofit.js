const calculateProfit = (
  sellPrice,
  buyPrice,
  qty
) => {
  return (
    (sellPrice - buyPrice) *
    qty
  );
};

module.exports =
  calculateProfit;