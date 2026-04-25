const generateReceipt = () => {
  return (
    "RC" +
    Date.now()
  );
};

module.exports =
  generateReceipt;