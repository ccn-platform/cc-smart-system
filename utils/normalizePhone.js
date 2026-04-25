const normalizePhone = (phone) => {
  let p = phone.replace(/\D/g, "");

  if (p.startsWith("0")) {
    p = "255" + p.slice(1);
  }

  if (p.startsWith("7") || p.startsWith("6")) {
    p = "255" + p;
  }

  return p;
};

module.exports = normalizePhone;