const BusinessCategory = require("../models/BusinessCategory");

const getBusinessCategories = async (req, res) => {
  try {
    await BusinessCategory.find(
  { isActive: true }
)
.select("name sortOrder")
.sort({ sortOrder: 1 })
.lean();

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
