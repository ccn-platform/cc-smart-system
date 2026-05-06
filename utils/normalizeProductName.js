 const normalizeProductName = (name = "") => {
  let text = String(name)
    .toLowerCase()

    // 🔥 remove symbols (lakini acha numbers ndani ya words)
    .replace(/[^a-z0-9 ]/g, " ")

    // 🔥 remove standalone units only
    .replace(/\b(kg|kilo|gm|g|ltr|ml|pkt|pack|pc|pcs|box)\b/g, "")

    // 🔥 remove standalone numbers
    .replace(/\b\d+\b/g, "")

    // 🔥 clean spaces
    .replace(/\s+/g, " ")
    .trim();

  // 🔥 split
  let words = text.split(" ");

  // 🔥 remove very short noise (important)
  words = words.filter(w => w.length > 1);

  // 🔥 remove duplicates
  words = [...new Set(words)];

  // 🔥 sort (KEY FOR MATCHING)
  words.sort();

  return words.join(" ");
};

module.exports = normalizeProductName;
