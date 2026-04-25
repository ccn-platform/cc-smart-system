 const cleanOCRText = (text) => {
  return String(text)
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[|]/g, " ")
    .replace(/ +/g, " ")
    .replace(/\n+/g, "\n")
    .trim();
};

module.exports =
  cleanOCRText;