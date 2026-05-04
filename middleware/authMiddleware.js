  const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  try {
    let token;

    // 🔥 GET TOKEN
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        message: "Not authorized, no token"
      });
    }

    // 🔥 VERIFY TOKEN
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired token"
      });
    }

    // 🔥 GET USER
    const user = await User.findById(decoded.id)
      .select("-password");

    if (!user) {
      return res.status(401).json({
        message: "User not found"
      });
    }

    // 🔥 CHECK ACTIVE
    if (!user.isActive) {
      return res.status(403).json({
        message: "Account disabled"
      });
    }

    // 🔥 CHECK STAFF OWNER
    if (user.role === "staff" && !user.owner) {
      return res.status(403).json({
        message: "Invalid staff account (no owner)"
      });
    }

    // 🔥 SET USER
    req.user = user;

    // 🔥 OWNER LOGIC
    req.ownerId =
      user.role === "owner"
        ? user._id
        : user.owner;

    next();

  } catch (error) {
    console.log("AUTH ERROR:", error.message);

    res.status(401).json({
      message: "Authentication failed"
    });
  }
};

 // 🔥 OWNER ONLY (FIXED)
const onlyOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      message: "User not authenticated"
    });
  }

  if (req.user.role !== "owner") {
    return res.status(403).json({
      message: "Owner only action"
    });
  }

  return next(); // 🔥 muhimu
};

// 🔥 STAFF OR OWNER (optional)
const allowRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied"
      });
    }
    next();
  };
};

module.exports = {
  protect,
  onlyOwner,
  allowRoles // 🔥 mpya (powerful sana)
};
