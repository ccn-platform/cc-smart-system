  const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  addStaff,
   getStaff
} = require("../controllers/authController");

// 🔥 IMPORT MIDDLEWARE
const {
  protect,
  onlyOwner
} = require("../middleware/authMiddleware");

// 🔥 ROUTES
router.post("/register", registerUser);
router.post("/login", loginUser);

// 🔥 OWNER ONLY
router.post("/add-staff", protect, onlyOwner, addStaff);

router.get("/staff", protect, onlyOwner, getStaff); // 🔥 mpya

module.exports = router;
