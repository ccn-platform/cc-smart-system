 const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const normalizePhone = require("../utils/normalizePhone");

const registerUser = async (req, res) => {
  try {
    let {
      name,
      businessName,
      phone,
      password,
      businessCategory,
      mkoa,
      wilaya,
      mtaa
    } = req.body;

    // normalize phone
    phone = normalizePhone(phone);

    // validate
    if (
      !name ||
      !businessName ||
      !phone ||
      !password ||
      !businessCategory ||
      !mkoa ||
      !wilaya ||
      !mtaa
    ) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    // duplicate phone
    const exists = await User.findOne({ phone });

    if (exists) {
      return res.status(400).json({
        message: "Phone already registered"
      });
    }

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // create user
    const user = await User.create({
      name,
      businessName,
      phone,
      password: hashedPassword,
      businessCategory,
      mkoa,
      wilaya,
      mtaa
    });

    // token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        businessName: user.businessName,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};



const loginUser = async (req, res) => {
  try {
    let { phone, password } = req.body;

    phone = normalizePhone(phone);

    if (!phone || !password) {
      return res.status(400).json({
        message: "Phone and password required"
      });
    }

    // check user
    const user = await User.findOne({ phone });

    if (!user) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // compare password
    const match = await bcrypt.compare(
      password,
      user.password
    );

    if (!match) {
      return res.status(400).json({
        message: "Invalid credentials"
      });
    }

    // token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        businessName: user.businessName,
        phone: user.phone,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser
}; 