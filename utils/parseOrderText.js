  const parseOrderText = (text) => {
  const lines = String(text).split("\n");

  const items = [];

  for (let raw of lines) {
    let line = raw.trim();

    if (!line) continue;

    const nums =
      line.match(/\d+/g) || [];

    if (nums.length < 2) continue;

    const qty = Number(nums[0]);

    const totalPrice =
      Number(nums[nums.length - 1]);

    const buyPrice =
      Math.round(totalPrice / qty);

    const name = line
      .replace(/\d+/g, "")
      .trim();

    items.push({
      name,
      qty,
      buyPrice,
    });
  }

  return items;
};

module.exports = parseOrderText;