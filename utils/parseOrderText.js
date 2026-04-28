 const parseOrderText = (text) => {
  const lines = String(text)
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const items = [];

  for (const line of lines) {
    const nums =
      line.match(/\d+/g) || [];

    if (nums.length < 2)
      continue;

    const qty =
      Number(nums[0]);

    const totalPrice =
      Number(nums[nums.length - 1]);

    if (!qty || !totalPrice)
      continue;

    let name = line;

    name = name.replace(
      nums[0],
      ""
    );

    const last =
      name.lastIndexOf(
        String(totalPrice)
      );

    if (last !== -1) {
      name =
        name.slice(0, last) +
        name.slice(
          last +
          String(totalPrice)
            .length
        );
    }

    name = name
      .replace(/[-x*]/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!name) continue;

    items.push({
      name,
      qty,
      buyPrice:
        Math.round(
          totalPrice / qty
        ),
    });
  }

  return items;
};

module.exports =
  parseOrderText;
