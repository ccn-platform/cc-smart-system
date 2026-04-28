const cleanOCRText = (text) => {
  const lines = String(text)
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[|]/g, " ")
    .replace(/ +/g, " ")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const merged = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // row starts with number
    if (/^\d+\s+/.test(line)) {
      while (
        i + 1 < lines.length &&
        !/^\d+\s+/.test(
          lines[i + 1]
        )
      ) {
        line +=
          " " +
          lines[i + 1];
        i++;
      }

      merged.push(line);
    }
  }

  return merged.join("\n");
};

module.exports =
  cleanOCRText;
