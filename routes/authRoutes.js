  const express = require("express");
const router = express.Router();

const {
  registerUser,
  loginUser,
  addStaff,
   getStaff,
   resetPin,
   sendResetPinCode,
    getProfile,
   deleteAccount,
    updateProfile,
     deleteStaff
} = require("../controllers/authController");

// 🔥 IMPORT MIDDLEWARE
const {
  protect,
  onlyOwner
} = require("../middleware/authMiddleware");

// 🔥 ROUTES
router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/send-reset-code",sendResetPinCode);
router.post("/reset-pin", resetPin);
// 🔥 OWNER ONLY
router.post("/add-staff", protect, onlyOwner, addStaff);

router.get("/staff", protect, onlyOwner, getStaff); // 🔥 mpya
router.delete("/staff/:staffId",protect,onlyOwner,deleteStaff);
router.put("/profile",protect,updateProfile);
router.delete("/account", protect, onlyOwner, deleteAccount);
router.get("/me", protect,getProfile);

module.exports = router;
