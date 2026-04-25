const express = require("express");
const router = express.Router();

const {
  getBusinessCategories
} = require("../controllers/metaController");

router.get(
  "/business-categories",
  getBusinessCategories
);

module.exports = router;