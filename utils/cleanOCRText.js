 const cleanOCRText = (text) => {
  const lines = String(text)
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[|]/g, " ")
    .replace(/ +/g, " ")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const cleaned = [];

  for (let line of lines) {
    // 🔥 chukua mistari yenye numbers 2 mwisho
    const match = line.match(
      /^(.+?)\s+(\d+)\s+(\d+)$/
    );

    if (match) {
      const name = match[1];
      const qty = match[2];
      const total = match[3];

      cleaned.push(
        `${name} ${qty} ${total}`
      );
    }
  }

  return cleaned.join("\n");
};

module.exports = cleanOCRText;
