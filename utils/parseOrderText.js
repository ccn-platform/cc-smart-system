  const parseOrderText = (text) => {
  const lines = String(text)
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);
console.log("LINES:", lines);
 
  const items = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // 🔥 clean line
    line = line
      .toLowerCase()
      .replace(/,/g, "")
      .replace(/tsh|tzs/gi, "")
      .replace(/@/g, " ")
         .replace(/\bx\b/g, " ")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/ +/g, " ")
      .trim();

    const parts = line.split(" ");

    if (parts.length < 3) continue;

    // 🔥 chukua numbers mwisho
    const numbers = parts.filter(p => !isNaN(p));

    if (numbers.length < 2) continue;

    const qty = Number(numbers[numbers.length - 2]);
    const total = Number(numbers[numbers.length - 1]);

    if (qty <= 0 || total <= 0) continue;

    // 🔥 jina = sehemu isiyo number
    const nameParts = parts.filter(p => isNaN(p));

    const name = nameParts.join(" ");

    if (!name) continue;

    items.push({
      no: items.length + 1,
      name,
      qty,
      buyPrice: Math.round(total / qty),
      total
    });
  }
 console.log("PARSED:", items);
  return items;
};

module.exports = parseOrderText;
