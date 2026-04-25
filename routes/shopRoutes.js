  const express = require("express");
const router = express.Router();

const {
  protect
} = require("../middleware/authMiddleware");

const {
  createShop,
  getMyShop,
  updateShop,
  addBranch,
  getBranches
} = require("../controllers/shopController");


// CREATE SHOP
router.post(
  "/create",
  protect,
  createShop
);


// GET MY SHOP
router.get(
  "/me",
  protect,
  getMyShop
);


// UPDATE SHOP
router.put(
  "/update",
  protect,
  updateShop
);


// ADD NEW BRANCH
router.post(
  "/branch",
  protect,
  addBranch
);


// GET ALL BRANCHES
router.get(
  "/branches",
  protect,
  getBranches
);

module.exports = router;