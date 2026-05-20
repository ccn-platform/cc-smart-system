  const Shop = require("../models/Shop");
const Branch = require("../models/Branch");
const User = require("../models/User");
const normalizePhone = require("../utils/normalizePhone");


// GET REAL OWNER ID
const getOwnerId = (user) => {
  if (user.role === "staff" && user.owner) {
    return user.owner;
  }

  return user._id || user.id;
};


// CREATE SHOP + MAIN BRANCH
const createShop = async (req, res) => {
  try {
    const user = await User.findById(
      req.user.id
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    const ownerId = getOwnerId(user);

    const exists = await Shop.findOne({
      owner: ownerId
    });

    if (exists) {
      return res.status(400).json({
        message: "Shop already exists"
      });
    }

    const shop = await Shop.create({
      owner: ownerId,
      businessName: user.businessName,
      phone: user.phone,
      mkoa: user.mkoa,
      wilaya: user.wilaya,
      mtaa: user.mtaa,
      category: user.businessCategory
    });

    await Branch.create({
  shop: shop._id,
  name: `${user.businessName} Main Branch`,
  phone: user.phone,
  manager: user.name,
  mkoa: user.mkoa,
  wilaya: user.wilaya,
  mtaa: user.mtaa,
  isMain: true,
  isActive: true,

  subscription: {
    plan: "trial",
    startDate: new Date(),
    expiresAt: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ),
    isActive: true
  }
});
    return res.status(201).json(shop);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};


// GET MY SHOP
const getMyShop = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const shop = await Shop.findOne({
      owner: ownerId
    }).populate(
      "category",
      "name"
    );

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    return res.status(200).json(shop);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};


// UPDATE SHOP
const updateShop = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const updates = {};

    if (req.body.businessName !== undefined) {
      if (!req.body.businessName.trim()) {
        return res.status(400).json({
          message: "Business name required"
        });
      }

      updates.businessName =
        req.body.businessName.trim();
    }

    if (req.body.phone !== undefined) {
      updates.phone =
        normalizePhone(req.body.phone);
    }

    if (req.body.email !== undefined) {
      updates.email =
        req.body.email;
    }

    if (req.body.mkoa !== undefined) {
      updates.mkoa =
        req.body.mkoa;
    }

    if (req.body.wilaya !== undefined) {
      updates.wilaya =
        req.body.wilaya;
    }

    if (req.body.mtaa !== undefined) {
      updates.mtaa =
        req.body.mtaa;
    }

    if (req.body.logo !== undefined) {
      updates.logo =
        req.body.logo;
    }

    const shop =
      await Shop.findOneAndUpdate(
        {
          owner: ownerId
        },
        updates,
        {
          new: true
        }
      );

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    return res.status(200).json(shop);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};


// ADD BRANCH
const addBranch = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const shop = await Shop.findOne({
      owner: ownerId
    });

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    if (!req.body.name?.trim()) {
      return res.status(400).json({
        message: "Branch name required"
      });
    }

    if (req.body.phone) {
      req.body.phone =
        normalizePhone(req.body.phone);
    }

    const exists =
      await Branch.findOne({
        shop: shop._id,
        name: req.body.name.trim(),
        isActive: true
      });

    if (exists) {
      return res.status(400).json({
        message:
          "Branch already exists"
      });
    }
const branch = await Branch.create({
  shop: shop._id,
  name: req.body.name.trim(),
  phone: req.body.phone || "",
  manager: req.body.manager || "",
  mkoa: req.body.mkoa || "",
  wilaya: req.body.wilaya || "",
  mtaa: req.body.mtaa || "",
  isMain: false,
  isActive: true,

  subscription: {
    plan: "trial",
    startDate: new Date(),
    expiresAt: new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ),
    isActive: true
  }
});
   
    return res.status(201).json(branch);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};


// GET BRANCHES
const getBranches = async (req, res) => {
  try {
    const ownerId = getOwnerId(req.user);

    const shop = await Shop.findOne({
      owner: ownerId
    });

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    const branches = await Branch.find({
      shop: shop._id,
      isActive: true
    }).sort({
      createdAt: -1
    });

    return res.status(200).json(branches);

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};


const deleteBranch = async (
  req,
  res
) => {
  try {
    const ownerId =
      getOwnerId(req.user);

    const { branchId } =
      req.params;

    const shop =
      await Shop.findOne({
        owner: ownerId
      });

    if (!shop) {
      return res.status(404).json({
        message: "Shop not found"
      });
    }

    const branch =
      await Branch.findOne({
        _id: branchId,
        shop: shop._id,
        isActive: true
      });

    if (!branch) {
      return res.status(404).json({
        message:
          "Branch not found"
      });
    }

    if (branch.isMain) {
      return res.status(400).json({
        message:
          "Main branch cannot be deleted"
      });
    }

    branch.isActive = false;
    await branch.save();

    await User.updateMany(
      {
        branch: branch._id,
        role: "staff"
      },
      {
        isActive: false
      }
    );

    return res.status(200).json({
      message:
        "Branch deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};

module.exports = {
  createShop,
    deleteBranch,
  getMyShop,
  updateShop,
  addBranch,
  getBranches
};
