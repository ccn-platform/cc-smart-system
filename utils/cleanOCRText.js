 const cleanOCRText = (text) => {
  const lines = String(text)
    .replace(/\r/g, "")
    .replace(/\t/g, " ")
    .replace(/[|=:]/g, " ")
    .replace(/ +/g, " ")
    .split("\n")
    .map(x => x.trim())
    .filter(Boolean);

  const rows = [];
  let current = "";

  for (const line of lines) {
    // new row starts with number
    if (/^\d+\s+/.test(line)) {
      if (current)
        rows.push(current);

      current = line;
    } else {
      // append only if no new row
      current += " " + line;
    }
  }

  if (current)
    rows.push(current);

  return rows
    .map(x =>
      x.replace(/\s+/g, " ").trim()
    )
    .join("\n");
};

module.exports =
  cleanOCRText;
