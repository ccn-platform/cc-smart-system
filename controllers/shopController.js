 const Shop = require("../models/Shop");
const Branch = require("../models/Branch");
const User = require("../models/User");

const normalizePhone = require("../utils/normalizePhone");


// CREATE SHOP + MAIN BRANCH
const createShop = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user.id
      );

    if (!user) {
      return res.status(404).json({
        message:
          "User not found"
      });
    }

    const exists =
      await Shop.findOne({
        owner:
          req.user.id
      });

    if (exists) {
      return res.status(400).json({
        message:
          "Shop already exists"
      });
    }

    const shop =
      await Shop.create({
        owner:
          req.user.id,

        businessName:
          user.businessName,

        phone:
          user.phone,

        mkoa:
          user.mkoa,

        wilaya:
          user.wilaya,

        mtaa:
          user.mtaa,

        category:
          user.businessCategory
      });

    await Branch.create({
      shop:
        shop._id,

      name:
        user.businessName +
        " Main Branch",

      phone:
        user.phone,

      mkoa:
        user.mkoa,

      wilaya:
        user.wilaya,

      mtaa:
        user.mtaa,

      isMain: true
    });

    res.status(201).json(
      shop
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// GET MY SHOP
const getMyShop =
  async (req, res) => {
    try {
      const shop =
        await Shop.findOne({
          owner:
            req.user.id
        }).populate(
          "category",
          "name"
        );

      if (!shop) {
        return res.status(404).json({
          message:
            "Shop not found"
        });
      }

      res.status(200).json(
        shop
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };


// UPDATE SHOP
const updateShop =
  async (req, res) => {
    try {
      if (req.body.phone) {
        req.body.phone =
          normalizePhone(
            req.body.phone
          );
      }

      const shop =
        await Shop.findOneAndUpdate(
          {
            owner:
              req.user.id
          },
          req.body,
          {
            new: true
          }
        );

      if (!shop) {
        return res.status(404).json({
          message:
            "Shop not found"
        });
      }

      res.status(200).json(
        shop
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };


// ADD BRANCH
const addBranch =
  async (req, res) => {
    try {
      const shop =
        await Shop.findOne({
          owner:
            req.user.id
        });

      if (!shop) {
        return res.status(404).json({
          message:
            "Shop not found"
        });
      }

      if (req.body.phone) {
        req.body.phone =
          normalizePhone(
            req.body.phone
          );
      }

      const branch =
        await Branch.create({
          shop:
            shop._id,
          ...req.body
        });

      res.status(201).json(
        branch
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };


// GET BRANCHES
const getBranches =
  async (req, res) => {
    try {
      const shop =
        await Shop.findOne({
          owner:
            req.user.id
        });

      if (!shop) {
        return res.status(404).json({
          message:
            "Shop not found"
        });
      }

      const branches =
        await Branch.find({
          shop:
            shop._id,
          isActive: true
        }).sort({
          createdAt: -1
        });

      res.status(200).json(
        branches
      );
    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };


module.exports = {
  createShop,
  getMyShop,
  updateShop,
  addBranch,
  getBranches
};