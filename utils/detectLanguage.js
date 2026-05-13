const detectLanguage =
  (message = "") => {
    const text =
      String(message || "").trim();

    if (!text) {
      return "auto";
    }

    return "auto";
  };

module.exports = {
  detectLanguage
};
