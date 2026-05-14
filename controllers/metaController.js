  const BusinessCategory = require("../models/BusinessCategory");

const getBusinessCategories = async (req, res) => {
  try {
    const categories = await BusinessCategory.find({
      isActive: true
    }).sort({ sortOrder: 1 });

    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  getBusinessCategories
};
