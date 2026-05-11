 const express = require("express");
const router = express.Router();

const authController =
  require("../controllers/authController");

const middleware =
  require("../middleware/authMiddleware");

console.log({
  registerUser:
    typeof authController.registerUser,
  loginUser:
    typeof authController.loginUser,
  addStaff:
    typeof authController.addStaff,
  getStaff:
    typeof authController.getStaff,
  protect:
    typeof middleware.protect,
  onlyOwner:
    typeof middleware.onlyOwner
});

router.post(
  "/register",
  authController.registerUser
);

router.post(
  "/login",
  authController.loginUser
);

router.post(
  "/add-staff",
  middleware.protect,
  middleware.onlyOwner,
  authController.addStaff
);

router.get(
  "/staff",
  middleware.protect,
  middleware.onlyOwner,
  authController.getStaff
);

module.exports = router;
