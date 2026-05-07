  const parseOrderText = (text) => {
  const lines = String(text)
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const items = [];

  for (const line of lines) {
    const parts = line.split("|");

    if (parts.length < 3) continue;

    const name = parts[0]?.trim();

    const qty = Number(
      parts[1]?.replace(/[^\d]/g, "")
    );

    const total = Number(
      parts[2]?.replace(/[^\d]/g, "")
    );

    if (!name || !qty || !total) continue;

    items.push({
      no: items.length + 1,
      name,
      qty,
      buyPrice: Math.round(total / qty),
      total,
    });
  }

  console.log("PARSED:", items);

  return items;
};

module.exports = parseOrderText;
