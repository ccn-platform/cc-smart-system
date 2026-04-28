  const parseOrderText = (text) => {
  const lines = String(text).split("\n");

  const items = [];

  for (let raw of lines) {
    const line = raw.trim();

    if (!line) continue;

    const nums =
      line.match(/\d+/g) || [];

    if (nums.length < 2) continue;

    const qty =
      Number(nums[0]);

    const totalPrice =
      Number(nums[nums.length - 1]);

    if (!qty || qty <= 0)
      continue;

    const buyPrice =
      Math.round(
        totalPrice / qty
      );

    let name = line;

    // remove first qty only
    name = name.replace(
      nums[0],
      ""
    );

    // remove last total only
    const lastIndex =
      name.lastIndexOf(
        String(totalPrice)
      );

    if (lastIndex !== -1) {
      name =
        name.slice(
          0,
          lastIndex
        ) +
        name.slice(
          lastIndex +
            String(
              totalPrice
            ).length
        );
    }

    name = name
      .replace(/\s+/g, " ")
      .trim();

    if (!name) continue;

    items.push({
      name,
      qty,
      buyPrice,
    });
  }

  return items;
};

module.exports =
  parseOrderText;
