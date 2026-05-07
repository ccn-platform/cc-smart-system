 const normalizeProductName = (name = "") => {
  let text = String(name)
    .toLowerCase()

    // 🔥 normalize unicode
    .normalize("NFKD")

    // 🔥 OCR number mistakes
    .replace(/0/g, "o")
    .replace(/1/g, "l")

    // 🔥 remove symbols only
    .replace(/[^a-z0-9 ]/g, " ")

    // 🔥 clean spaces
    .replace(/\s+/g, " ")
    .trim();

  // 🔥 split words
  let words = text
    .split(" ")
    .filter(Boolean);

  // 🔥 remove duplicate words
  words = [...new Set(words)];

  // 🔥 remove tiny noise
  words = words.filter(
    (w) => w.length > 1
  );

  // 🔥 stable ordering
  words.sort();

  return words.join(" ");
};

module.exports = normalizeProductName;
