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
      Number(
        nums[
          nums.length - 2
        ]
      );

    const totalPrice =
      Number(
        nums[
          nums.length - 1
        ]
      );

    if (!qty || !totalPrice)
      continue;

    let name = line;

    name = name.replace(
      new RegExp(
        "\\b" +
          qty +
          "\\b"
      ),
      ""
    );

    name = name.replace(
      new RegExp(
        "\\b" +
          totalPrice +
          "\\b"
      ),
      ""
    );

    name = name
      .replace(
        /x|pcs|pc|pkt|kg|g|ltr|ml/gi,
        " "
      )
      .replace(/\s+/g, " ")
      .trim();

    if (!name)
      continue;

    items.push({
      name,
      qty,
      buyPrice:
        Math.round(
          totalPrice /
            qty
        ),
    });
  }

  return items;
};

module.exports =
  parseOrderText;
