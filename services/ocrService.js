  const axios = require("axios");

const readImageText = async (file) => {
  try {
    const imageBase64 =
      file.buffer.toString("base64");

    const url =
`https://vision.googleapis.com/v1/images:annotate?key=${process.env.GOOGLE_VISION_API_KEY}`;

    const response =
      await axios.post(url, {
        requests: [
          {
            image: {
              content: imageBase64
            },
            features: [
              {
                type:
                  "DOCUMENT_TEXT_DETECTION"
              }
            ]
          }
        ]
      });

    const text =
      response.data
      ?.responses?.[0]
      ?.fullTextAnnotation
      ?.text || "";

    return text.trim();

  } catch (error) {
    console.log(
      "OCR ERROR:",
      error.response?.data ||
      error.message
    );

    throw new Error(
      "Failed to read image text"
    );
  }
};

module.exports = {
  readImageText
};
