    const mongoose = require("mongoose");

const crypto = require("crypto");
const pushService = require("../services/pushService");
const smsService = require("../services/smsService");
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
  mkoa = "",
  wilaya = "",
  mtaa = ""
} = req.body;

    // NORMALIZE PHONE
    phone = normalizePhone(phone);

    // VALIDATION
    if (
      !name ||
      !businessName ||
      !phone ||
      !password ||
      !businessCategory
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
    businessName: businessName.trim(),
    phone,
    password: hashedPassword,
    businessCategory,
    mkoa,
    wilaya,
    mtaa
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
        Date.now() +
        14 * 24 * 60 * 60 * 1000
      ),
      isActive: true
    }
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

    // GET MAIN BRANCH
const mainBranch =
  await Branch.findOne({
    shop: shop._id,
    isMain: true
  }).select(
    "name subscription"
  );

 return res.status(201).json({
  token,
  user: {
    id: user._id,
    name: user.name,
    businessName:
      user.businessName,
    phone: user.phone,

    businessCategory:
      businessCategory ===
      "credit_business"
        ? "credit_business"
        : "cash_business",

    role: user.role,
    owner: null,

    branch: mainBranch
      ? {
          id: mainBranch._id,
          name: mainBranch.name,
          subscription:
            mainBranch.subscription
        }
      : null,

    subscription:
      mainBranch?.subscription ||
      null
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
  phone,
  isActive: true
})
.populate(
  "branch",
  "name"
)
.populate(
  "businessCategory",
  "code name"
);
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

     // BRANCH SUBSCRIPTION
let subscription = null;

if (user.role === "staff") {
  if (user.branch?._id) {
    const branch =
      await Branch.findById(
        user.branch._id
      ).select(
        "subscription"
      );

    subscription =
      branch?.subscription || null;
  }
} else {
  const shop =
    await Shop.findOne({
      owner: user._id
    });

  if (shop) {
    const mainBranch =
      await Branch.findOne({
        shop: shop._id,
        isMain: true
      }).select(
        "subscription"
      );

    subscription =
      mainBranch?.subscription || null;
  }
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
    businessCategory:
  user.businessCategory?.code,
    role: user.role,
    owner: user.owner,

    branch:
      user.role === "staff"
        ? (
            user.branch
              ? {
                  id: user.branch._id,
                  name:
                    user.branch.name,
                  subscription
                }
              : null
          )
        : null,

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

 
const addStaff =
  async (req, res) => {
    try {
      if (
        !req.user ||
        !req.ownerId
      ) {
        return res.status(401).json({
          message:
            "Invalid owner session"
        });
      }

      const {
        name,
        phone,
        password,
        branchId
      } = req.body;

      if (
        !name ||
        !phone ||
        !password ||
        !branchId
      ) {
        return res.status(400).json({
          message:
            "Name, phone, password and branch required"
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

      // OWNER SHOP
      const shop =
        await Shop.findOne({
          owner:
            req.ownerId
        });

      if (!shop) {
        return res.status(404).json({
          message:
            "Shop not found"
        });
      }

      // VALIDATE BRANCH
      const branch =
        await Branch.findOne({
          _id:
            branchId,
          shop:
            shop._id,
          isActive: true
        });

      if (!branch) {
        return res.status(400).json({
          message:
            "Invalid branch selected"
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          10
        );

      const staff =
        new User({
          name:
            name.trim(),

          phone:
            normalizedPhone,

          password:
            hashedPassword,

          role:
            "staff",

          owner:
            req.ownerId,

          branch:
            branch._id,

          businessName:
            req.user.businessName,

          businessCategory:
            req.user.businessCategory,

          mkoa:
            req.user.mkoa,

          wilaya:
            req.user.wilaya,

          mtaa:
            req.user.mtaa
        });

      await staff.save();

      return res.status(201).json({
        message:
          "Staff created successfully",

        staff: {
          id:
            staff._id,

          name:
            staff.name,

          phone:
            staff.phone,

          role:
            staff.role,

          branch:
            {
              id:
                branch._id,

              name:
                branch.name
            }
        }
      });

    } catch (error) {
      console.log(
        "ADD STAFF ERROR:",
        error
      );

      return res.status(500).json({
        message:
          error.message ||
          "Failed to create staff"
      });
    }
  };

 const getStaff =
  async (req, res) => {
    try {
      const staff =
        await User.find({
          owner:
            req.ownerId,
          role:
            "staff",
          isActive: true
        })
          .select(
            "name phone role branch createdAt"
          )
          .populate(
            "branch",
            "name"
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

  const deleteStaff = async (req, res) => {
  try {
    const { staffId } = req.params;

    const staff = await User.findOne({
      _id: staffId,
      owner: req.ownerId,
      role: "staff",
      isActive: true
    });

    if (!staff) {
      return res.status(404).json({
        message: "Staff not found"
      });
    }

    staff.isActive = false;
    await staff.save();

    return res.status(200).json({
      message: "Staff deleted successfully"
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};
 const deleteAccount = async (req, res) => {
  const session =
    await mongoose.startSession();

  try {
    session.startTransaction();

    const ownerId =
      req.ownerId;

    // FIND SHOP
    const shop =
      await Shop.findOne({
        owner: ownerId
      }).session(session);

    // DELETE STAFF + OWNER USERS
    await User.deleteMany(
      {
        $or: [
          { _id: ownerId },
          { owner: ownerId }
        ]
      },
      { session }
    );

    // DELETE BRANCHES + SHOP
    if (shop) {
      await Branch.deleteMany(
        {
          shop: shop._id
        },
        { session }
      );

      await Shop.deleteOne(
        {
          _id: shop._id
        },
        { session }
      );
    }

    await session.commitTransaction();

    return res.status(200).json({
      message:
        "Account deleted permanently"
    });

  } catch (error) {
    await session.abortTransaction();

    return res.status(500).json({
      message:
        error.message
    });

  } finally {
    session.endSession();
  }
};
 
const updateProfile = async (req, res) => {
  try {
    const {
      name,
      phone,
      businessName,
      password,
      mkoa,
      wilaya,
      mtaa
    } = req.body;

    const user =
      await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    if (name) {
      user.name = name.trim();
    }

    if (phone) {
      const normalizedPhone =
        normalizePhone(phone);

      const exists =
        await User.findOne({
          phone: normalizedPhone,
          _id: {
            $ne: user._id
          }
        });

      if (exists) {
        return res.status(400).json({
          message:
            "Phone already in use"
        });
      }

      user.phone =
        normalizedPhone;
    }

    if (
      businessName &&
      user.role === "owner"
    ) {
      user.businessName =
        businessName.trim();

      await Shop.updateOne(
        {
          owner: user._id
        },
        {
          businessName:
            businessName.trim()
        }
      );
    }

    if (mkoa !== undefined) {
      user.mkoa = mkoa;
    }

    if (wilaya !== undefined) {
      user.wilaya = wilaya;
    }

    if (mtaa !== undefined) {
      user.mtaa = mtaa;
    }

    if (password) {
      user.password =
        await bcrypt.hash(
          password,
          10
        );
    }

    await user.save();

    return res.status(200).json({
      message:
        "Profile updated successfully",

      user: {
        id: user._id,
        name: user.name,
        businessName:
          user.businessName,
        phone: user.phone,
        role: user.role,
        mkoa: user.mkoa,
        wilaya: user.wilaya,
        mtaa: user.mtaa
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};
const getProfile = async (
  req,
  res
) => {
  try {
    const user =
      await User.findById(
        req.user._id
      ).populate(
        "businessCategory"
      );

    res.json({
      user
    });

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};
 const sendResetPinCode = async (
  req,
  res
) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({
        message: "Phone required"
      });
    }

    const normalized =
      normalizePhone(phone);

    const user =
      await User.findOne({
        phone: normalized,
        isActive: true
      }).select(
        "+resetPinRequestCount +resetPinRequestWindow +resetPinRequestBlockedUntil"
      );

    if (!user) {
      return res.status(200).json({
        message:
          "Ikiwa account ipo, code itatumwa."
      });
    }

    // BLOCK CHECK
    if (
      user.resetPinRequestBlockedUntil &&
      new Date() <
        user.resetPinRequestBlockedUntil
    ) {
      return res.status(429).json({
        message:
          "Umeomba code mara nyingi. Jaribu tena baada ya dakika 30."
      });
    }

    // ACTIVE CODE CHECK
    if (
      user.resetPinExpiresAt &&
      user.resetPinExpiresAt.getTime() >
        Date.now()
    ) {
      return res.status(400).json({
        message:
          "Subiri kidogo kabla ya kuomba code nyingine."
      });
    }

    // RESET WINDOW
    if (
      !user.resetPinRequestWindow ||
      user.resetPinRequestWindow.getTime() <
        Date.now()
    ) {
      user.resetPinRequestCount = 0;

      user.resetPinRequestWindow =
        new Date(
          Date.now() +
          30 * 60 * 1000
        );
    }

    // COUNT REQUEST
    user.resetPinRequestCount =
      (user.resetPinRequestCount || 0) + 1;

    // BLOCK AFTER 3
    if (
      user.resetPinRequestCount > 3
    ) {
      user.resetPinRequestBlockedUntil =
        new Date(
          Date.now() +
          30 * 60 * 1000
        );

      await user.save();

      return res.status(429).json({
        message:
          "Umeomba code mara nyingi. Jaribu tena baada ya dakika 30."
      });
    }

    const code =
      crypto.randomInt(
        100000,
        999999
      ).toString();

    user.resetPinCode =
      crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");

    user.resetPinExpiresAt =
      new Date(
        Date.now() +
        5 * 60 * 1000
      );

    user.resetPinAttempts = 0;
    user.resetPinBlockedUntil =
      null;

    await user.save();

    try {
      await pushService.sendToUser(
        user._id,
        {
          title: "Reset PIN",
          body:
            `Code yako ni ${code}`,
          type: "PIN_RESET"
        }
      );
    } catch {}

    try {
      await smsService.sendSMS(
        normalized,
        `CCN: Biashara Plus code yako ya kurekebisha PIN ni ${code}. Itatumika kwa dakika 5.`
      );
    } catch (err) {
      console.log(
        "SMS ERROR:",
        err.message
      );
    }

    return res.status(200).json({
      message: "Code imetumwa."
    });

  } catch (error) {
    return res.status(500).json({
      message: error.message
    });
  }
};

const resetPin = async (
  req,
  res
) => {
  try {
    const {
      phone,
      code,
      newPin
    } = req.body;

    if (
      !phone ||
      !code ||
      !newPin
    ) {
      return res.status(400).json({
        message:
          "Phone, code and new PIN required"
      });
    }

    if (
      String(newPin).length < 4
    ) {
      return res.status(400).json({
        message:
          "PIN lazima iwe angalau digits 4"
      });
    }

    const normalized =
      normalizePhone(phone);

    const user =
      await User.findOne({
        phone: normalized,
        isActive: true
      }).select(
        "+resetPinCode +resetPinExpiresAt +resetPinAttempts +resetPinBlockedUntil +password"
      );

    if (!user) {
      return res.status(400).json({
        message:
          "Invalid request"
      });
    }

    if (
      user.resetPinBlockedUntil &&
      new Date() <
        user.resetPinBlockedUntil
    ) {
      return res.status(400).json({
        message:
          "Jaribu tena baada ya dakika 10"
      });
    }

    const hashedCode =
      crypto
        .createHash("sha256")
        .update(code)
        .digest("hex");

   if (
  user.resetPinCode !== hashedCode ||
  !user.resetPinExpiresAt ||
  user.resetPinExpiresAt.getTime() < Date.now()
) {
  user.resetPinAttempts =
    (user.resetPinAttempts || 0) + 1;

  if (
    user.resetPinAttempts >= 5
  ) {
    user.resetPinBlockedUntil =
      new Date(
        Date.now() +
        10 * 60 * 1000
      );

    user.resetPinAttempts = 0;
  }

  await user.save();

  return res.status(400).json({
    message:
      "Code si sahihi au ime-expire"
  });
}
    const hashedPassword =
      await bcrypt.hash(
        newPin,
        10
      );

    user.password =
      hashedPassword;

    user.resetPinCode =
      null;

    user.resetPinExpiresAt =
      null;

    user.resetPinAttempts =
      0;

    user.resetPinBlockedUntil =
      null;

    await user.save();

    try {
      await pushService.sendToUser(
        user._id,
        {
          title:
            "PIN Imebadilishwa",
          body:
            "PIN yako imebadilishwa kikamilifu.",
          type:
            "PIN_CHANGED"
        }
      );
    } catch {}

    return res.status(200).json({
      message:
        "PIN imebadilishwa"
    });

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
  getProfile,
   updateProfile,
  deleteAccount,
  getStaff,
  addStaff,
  sendResetPinCode,
  resetPin,
  deleteStaff
};
