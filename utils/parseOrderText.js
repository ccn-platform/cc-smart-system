 const parseOrderText = (text) => {
  const clean = String(text)
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const parts =
    clean.match(/([A-Za-z0-9\s]+?)\s+(\d+)\s+(\d+)/g) || [];

  const items = [];

  for (const part of parts) {
    const m = part.match(
      /(.+?)\s+(\d+)\s+(\d+)/
    );

    if (!m) continue;

    const name =
      m[1].trim();

    const qty =
      Number(m[2]);

    const totalPrice =
      Number(m[3]);

    if (!name || !qty) continue;

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
