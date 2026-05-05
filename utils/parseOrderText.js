 const parseOrderText = (text) => {
  const lines = String(text)
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const items = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 🔥 normalize line
    line = line
      .replace(/,/g, "") // remove commas
      .replace(/tsh|tzs/gi, "") // remove currency
      .trim();

    const match = line.match(
      /^(.+?)\s+(\d+)\s+(\d+)$/
    );

    if (!match) continue;

    const name = match[1];
    const qty = Number(match[2]);
    const total = Number(match[3]);

    if (!name || qty <= 0 || total <= 0) continue;

    items.push({
      no: items.length + 1,
      name,
      qty,
      buyPrice: Math.round(total / qty),
      total
    });
  }

  return items;
};

module.exports = parseOrderText;
