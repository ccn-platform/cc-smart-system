 const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  addStaff,
  getStaff,
  deleteAccount,
  updateProfile,
  deleteStaff
} = require("../controllers/authController");

const {
  protect,
  onlyOwner
} = require("../middleware/authMiddleware");

router.post("/register", registerUser);
router.post("/login", loginUser);

router.post(
  "/add-staff",
  protect,
  onlyOwner,
  addStaff
);

router.get(
  "/staff",
  protect,
  onlyOwner,
  getStaff
);

router.delete(
  "/staff/:staffId",
  protect,
  onlyOwner,
  deleteStaff
);

router.put(
  "/profile",
  protect,
  updateProfile
);

router.delete(
  "/account",
  protect,
  onlyOwner,
  deleteAccount
);

module.exports = router;
