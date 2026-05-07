  const cleanOCRText = (text) => {
  return String(text)
    .replace(/\r/g, "")
    .replace(/[|]/g, " | ")
    .replace(/\t/g, " ")
    .replace(/ +/g, " ")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean)
    .join("\n");
};

module.exports = cleanOCRText;
