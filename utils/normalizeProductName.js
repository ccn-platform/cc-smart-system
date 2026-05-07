  const normalizeProductName = (name = "") => {
  let text = String(name)
    .toLowerCase()

    // 🔥 normalize unicode
    .normalize("NFKD")

    // 🔥 remove symbols
    .replace(/[^a-z0-9 ]/g, " ")

    // 🔥 common OCR number mistakes
    .replace(/0/g, "o")
    .replace(/1/g, "l")
    .replace(/5/g, "s")

    // 🔥 normalize common OCR words
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

    // 🔥 OCR abbreviations
    .replace(/\bndg\b/g, "ndogo")
    .replace(/\bkubwaa\b/g, "kubwa")
    .replace(/\bchwnga\b/g, "chungwa")

 .replace(
 /\b(kg|kgs|kilo|ltr|lt|liter|litre|pkt|pack|pc|pcs|box|dozen)\b/g,
 ""
)

    // 🔥 clean spaces
    .replace(/\s+/g, " ")
    .trim();

  // 🔥 split into words
  let words = text
    .split(" ")
    .filter(Boolean);

  // 🔥 remove duplicate words
  words = [...new Set(words)];

  // 🔥 remove tiny OCR noise
  words = words.filter(
    (w) => w.length > 1
  );

  // 🔥 alphabetical order
  words.sort();

  return words.join(" ");
};

module.exports = normalizeProductName;
