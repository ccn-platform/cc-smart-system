  const readImageText =
async (
  imageUri
) => {
  if (!imageUri) {
    throw new Error(
      "Image required"
    );
  }

  try {
    // temporary OCR mock
    // replace later with
    // real OCR API

    const sampleText = `
1.maharage njano 10kg=23000
2.maharage soya 10kg=22000
3.Team sport 5pkt=9000
4.visu 12pc=6000
`;

    return sampleText
      .trim();
  } catch (error) {
    throw new Error(
      "Failed to read image text"
    );
  }
};

module.exports = {
  readImageText
};