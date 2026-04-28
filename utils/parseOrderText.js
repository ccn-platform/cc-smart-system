const parseOrderText = (text) => {
  const tokens = String(text)
    .split(/\s+/)
    .map(x => x.trim())
    .filter(Boolean);

  const items = [];
  let words = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    const isNum =
      /^\d+$/.test(token);

    if (!isNum) {
      words.push(token);
      continue;
    }

    const qty =
      Number(token);

    if (qty <= 0)
      continue;

    // search next big number as total
    let total = null;
    let jump = i;

    for (
      let j = i + 1;
      j < tokens.length;
      j++
    ) {
      if (/^\d+$/.test(tokens[j])) {
        const n =
          Number(tokens[j]);

        if (n > qty) {
          total = n;
          jump = j;
          break;
        }
      } else {
        break;
      }
    }

    if (
      words.length > 0 &&
      total !== null
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
      i = jump;
    }
  }

  return items;
};

module.exports =
  parseOrderText;
