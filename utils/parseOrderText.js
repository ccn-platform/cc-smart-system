 const parseOrderText = (text) => {
  const raw = String(text)
    .replace(/\r/g, "\n")
    .replace(/[|,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const lines = raw
    .split(/\n+/)
    .map(x => x.trim())
    .filter(Boolean);

  const items = [];

  for (let line of lines) {
    const nums = line.match(/\d+/g) || [];

    if (nums.length < 2) continue;

    const qty = Number(nums[0]);
    const totalPrice =
      Number(nums[nums.length - 1]);

    if (!qty || !totalPrice) continue;

    let name = line;

    name = name.replace(nums[0], "");

    const pos =
      name.lastIndexOf(
        String(totalPrice)
      );

    if (pos !== -1) {
      name =
        name.slice(0, pos) +
        name.slice(
          pos +
          String(totalPrice).length
        );
    }

    name = name
      .replace(/x|pcs|pc|pkt|kg/gi, " ")
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

module.exports = parseOrderText;
