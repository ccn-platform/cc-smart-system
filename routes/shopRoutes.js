  const express = require("express");
const router = express.Router();

const {
  protect
} = require("../middleware/authMiddleware");

const {
  getMyShop,
  updateShop,
    deleteBranch,
  addBranch,
  getBranches
} = require("../controllers/shopController");


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

router.delete(
  "/branch/:branchId",
  protect,
  deleteBranch
);
module.exports = router;
