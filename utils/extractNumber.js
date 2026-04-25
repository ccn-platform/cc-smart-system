 const extractNumber = (
  value
) => {
  const clean =
    String(value)
      .replace(/,/g, "")
      .replace(/[^\d.]/g, "");

  const num =
    parseFloat(clean);

  return isNaN(num)
    ? 0
    : num;
};

module.exports =
  extractNumber;