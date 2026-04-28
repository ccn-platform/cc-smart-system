 const parseOrderText = (text) => {
  const parts = String(text)
    .split(/\s+/)
    .map(x => x.trim())
    .filter(Boolean);

  const items = [];
  let words = [];

  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];

    const isNum =
      /^\d+$/.test(token);

    if (!isNum) {
      words.push(token);
      continue;
    }

    const qty =
      Number(token);

    const next =
      parts[i + 1];

    if (
      next &&
      /^\d+$/.test(next)
    ) {
      const total =
        Number(next);

      if (
        words.length > 0 &&
        qty > 0 &&
        total > qty
      ) {
        items.push({
          no:
            items.length + 1,
          name:
            words.join(" "),
          qty,
          buyPrice:
            Math.round(
              total / qty
            ),
        });

        words = [];
        i++; // skip total
      }
    }
  }

  return items;
};

module.exports =
  parseOrderText;
