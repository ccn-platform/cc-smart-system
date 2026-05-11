  const mongoose = require("mongoose");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Shop = require("../models/Shop");
const Branch = require("../models/Branch");
const normalizePhone = require("../utils/normalizePhone");

const registerUser = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

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

    // NORMALIZE PHONE
    phone = normalizePhone(phone);

    // VALIDATION
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
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        message: "All fields are required"
      });
    }

    // CHECK DUPLICATE
    const exists = await User.findOne({
      phone
    }).session(session);

    if (exists) {
      await session.abortTransaction();
      session.endSession();

      return res.status(400).json({
        message: "Phone already registered"
      });
    }

    // HASH PASSWORD
    const hashedPassword =
      await bcrypt.hash(password, 10);

    // CREATE USER
    const users = await User.create(
      [{
        name: name.trim(),
        businessName:
          businessName.trim(),
        phone,
        password: hashedPassword,
        businessCategory,
        mkoa,
        wilaya,
        mtaa,
        subscription: {
          plan: "trial",
          startDate: new Date(),
          expiresAt: new Date(
            Date.now() +
            14 * 24 * 60 * 60 * 1000
          ),
          isActive: true
        }
      }],
      { session }
    );

    const user = users[0];

    // CREATE SHOP
    const shops = await Shop.create(
      [{
        owner: user._id,
        businessName:
          user.businessName,
        category:
          user.businessCategory,
        phone:
          user.phone,
        mkoa:
          user.mkoa,
        wilaya:
          user.wilaya,
        mtaa:
          user.mtaa
      }],
      { session }
    );

    const shop = shops[0];

    // CREATE MAIN BRANCH
    await Branch.create(
      [{
        shop: shop._id,
        name:
          `${user.businessName} Main Branch`,
        phone:
          user.phone,
        manager:
          user.name,
        mkoa:
          user.mkoa,
        wilaya:
          user.wilaya,
        mtaa:
          user.mtaa,
        isMain: true,
        isActive: true
      }],
      { session }
    );

    // COMMIT
    await session.commitTransaction();
    session.endSession();

    // TOKEN
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // RESPONSE
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        businessName:
          user.businessName,
        phone: user.phone,
        role: user.role,
        owner: user.owner || null,
        subscription:
          user.subscription
      }
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.log(
      "REGISTER ERROR:",
      error
    );

    return res.status(500).json({
      message: error.message
    });
  }
};


const loginUser = async (req, res) => {
  try {
    let { phone, password } = req.body;

    // NORMALIZE PHONE
    phone = normalizePhone(phone);

    // VALIDATION
    if (!phone || !password) {
      return res.status(400).json({
        message:
          "Phone and password required"
      });
    }

    // FIND USER
    const user = await User.findOne({
      phone
    });

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid credentials"
      });
    }

    // CHECK PASSWORD
    const match =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!match) {
      return res.status(400).json({
        message:
          "Invalid credentials"
      });
    }

    // TOKEN
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // STAFF SUBSCRIPTION
    let subscription =
      user.subscription;

    if (
      user.role === "staff" &&
      user.owner
    ) {
      const owner =
        await User.findById(
          user.owner
        );

      subscription =
        owner?.subscription;
    }

    // RESPONSE
    return res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        businessName:
          user.businessName,
        phone: user.phone,
        role: user.role,
        owner: user.owner,
        subscription
      }
    });

  } catch (error) {
    console.log(
      "LOGIN ERROR:",
      error.message
    );

    return res.status(500).json({
      message: error.message
    });
  }
};


const addStaff = async (req, res) => {
  try {
    if (!req.user || !req.ownerId) {
      return res.status(401).json({
        message:
          "Invalid owner session"
      });
    }

    const {
      name,
      phone,
      password
    } = req.body;

    if (
      !name ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        message:
          "All fields are required"
      });
    }

    const normalizedPhone =
      normalizePhone(phone);

    const exists =
      await User.findOne({
        phone:
          normalizedPhone
      });

    if (exists) {
      return res.status(400).json({
        message:
          "Phone already registered"
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const staff = new User({
      name: name.trim(),
      phone:
        normalizedPhone,
      password:
        hashedPassword,
      role: "staff",
      owner: req.ownerId,
      businessName:
        req.user.businessName,
      businessCategory:
        req.user.businessCategory,
      mkoa: req.user.mkoa,
      wilaya:
        req.user.wilaya,
      mtaa: req.user.mtaa
    });

    await staff.save();

    return res.status(201).json({
      message:
        "Staff created successfully",
      staff: {
        id: staff._id,
        name: staff.name,
        phone: staff.phone,
        role: staff.role
      }
    });

  } catch (error) {
    console.log(
      "ADD STAFF ERROR FULL:",
      error
    );

    return res.status(500).json({
      message:
        error.message ||
        "Failed to create staff"
    });
  }
};


const getStaff = async (req, res) => {
  try {
    const staff =
      await User.find({
        owner: req.ownerId,
        role: "staff",
        isActive: true
      })
        .select(
          "name phone role createdAt"
        )
        .sort({
          createdAt: -1
        })
        .lean();

    return res.status(200).json(
      staff
    );

  } catch (error) {
    return res.status(500).json({
      message:
        error.message
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getStaff,
  addStaff
};
