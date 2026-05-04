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
  mtaa,
  subscription: {
    plan: "trial",
    startDate: new Date(),
    expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    isActive: true
  }
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
        role: user.role,

        owner: user.owner || null, // ✅ ONGEZA HII
        
        subscription: user.subscription
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

    role: user.role,

    owner: user.owner, // ✅ ONGEZA HII

    subscription: user.subscription
  }
});
     
  } catch (error) {
    res.status(500).json({
      message: error.message
    });
  }
};

const addStaff = async (req, res) => {
  try {
    const {
      name,
      phone,
      password
    } = req.body;

    
    if (!name || !phone || !password) {
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // 🔥 check duplicate
    const exists = await User.findOne({
      phone: normalizedPhone
    });

    if (exists) {
      return res.status(400).json({
        message: "Phone already registered"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔥 CREATE STAFF
    const staff = await User.create({
      name,
      phone: normalizedPhone,
      password: hashedPassword,

      role: "staff",

      // 🔥 LINK TO OWNER
      owner: req.user._id,

      // 🔥 COPY BUSINESS DATA
      businessName: req.user.businessName,
      businessCategory: req.user.businessCategory,
      mkoa: req.user.mkoa,
      wilaya: req.user.wilaya,
      mtaa: req.user.mtaa
    });

    res.status(201).json({
      message: "Staff created successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role
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
  loginUser,
   addStaff // 🔥 ongeza hii
}; 
