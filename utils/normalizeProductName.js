  const normalizeProductName = (name = "") => {
  let text = String(name)
    .toLowerCase()

    // 🔥 remove symbols
    .replace(/[^a-z0-9 ]/g, " ")

    // 🔥 normalize common words
    .replace(/\bsukr\b/g, "sukari")
    .replace(/\bsukal\b/g, "sukari")
    .replace(/\bsugar\b/g, "sukari")

    .replace(/\bmcel\b/g, "mchele")
    .replace(/\bmchle\b/g, "mchele")

    .replace(/\bmaha\b/g, "maharage")
    .replace(/\bharage\b/g, "maharage")

    .replace(/\bsbn\b/g, "sabuni")
    .replace(/\bsabn\b/g, "sabuni")

    .replace(/\bungaa\b/g, "unga")

    // 🔥 remove units
    .replace(/\b(kg|kilo|gm|g|ltr|ml|pkt|pack|pc|pcs|box)\b/g, "")

    // 🔥 remove numbers
    .replace(/\b\d+\b/g, "")

    // 🔥 clean spaces
    .replace(/\s+/g, " ")
    .trim();

  // 🔥 split words
  let words = text.split(" ");

  // 🔥 remove duplicates
  words = [...new Set(words)];

  // 🔥 sort words (VERY IMPORTANT)
  words.sort();

  return words.join(" ");
};

module.exports = normalizeProductName;
