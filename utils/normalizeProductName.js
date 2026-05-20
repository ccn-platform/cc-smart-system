  const normalizeProductName = (
  name = ""
) => {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

module.exports =
  normalizeProductName;
