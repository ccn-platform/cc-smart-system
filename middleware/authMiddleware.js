  const jwt =
  require("jsonwebtoken");

const User =
  require("../models/User");

const Shop =
  require("../models/Shop");

const Branch =
  require("../models/Branch");


// AUTH
const protect =
  async (
    req,
    res,
    next
  ) => {
    try {
      let token;

      if (
        req.headers.authorization &&
        req.headers.authorization.startsWith(
          "Bearer"
        )
      ) {
        token =
          req.headers.authorization.split(
            " "
          )[1];
      }

      if (!token) {
        return res.status(401).json({
          message:
            "Not authorized, no token"
        });
      }

      let decoded;

      try {
        decoded =
          jwt.verify(
            token,
            process.env.JWT_SECRET
          );
      } catch {
        return res.status(401).json({
          message:
            "Invalid or expired token"
        });
      }

      const user =
        await User.findById(
          decoded.id
        ).select(
          "-password"
        );

      if (!user) {
        return res.status(401).json({
          message:
            "User not found"
        });
      }

      if (!user.isActive) {
        return res.status(403).json({
          message:
            "Account disabled"
        });
      }

      if (
        user.role ===
          "staff" &&
        !user.owner
      ) {
        return res.status(403).json({
          message:
            "Invalid staff account"
        });
      }

      if (
        user.role ===
          "staff" &&
        !user.branch
      ) {
        return res.status(403).json({
          message:
            "Staff has no branch assigned"
        });
      }

      req.user = user;

      req.ownerId =
        user.role ===
        "owner"
          ? user._id
          : user.owner;

      next();

    } catch (error) {
      console.log(
        "AUTH ERROR:",
        error.message
      );

      return res.status(401).json({
        message:
          "Authentication failed"
      });
    }
  };


// BRANCH ACCESS
const branchAccess =
  async (
    req,
    res,
    next
  ) => {
    try {
      const branchId =
        req.headers[
          "x-branch-id"
        ];

      if (!branchId) {
        return res.status(400).json({
          message:
            "No branch selected"
        });
      }

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

      const branch =
        await Branch.findOne({
          _id:
            branchId,
          shop:
            shop._id,
          isActive:
            true
        });

      if (!branch) {
        return res.status(403).json({
          message:
            "Invalid branch access"
        });
      }

      // STAFF RESTRICTION
      if (
        req.user.role ===
          "staff" &&
        req.user.branch.toString() !==
          branch._id.toString()
      ) {
        return res.status(403).json({
          message:
            "Staff cannot access this branch"
        });
      }

      req.branch =
        branch;

      req.branchId =
        branch._id;

      next();

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// OWNER ONLY
const onlyOwner =
  (
    req,
    res,
    next
  ) => {
    if (
      req.user.role !==
      "owner"
    ) {
      return res.status(403).json({
        message:
          "Owner only action"
      });
    }

    next();
  };


// ROLE CHECK
const allowRoles =
  (...roles) => {
    return (
      req,
      res,
      next
    ) => {
      if (
        !roles.includes(
          req.user.role
        )
      ) {
        return res.status(403).json({
          message:
            "Access denied"
        });
      }

      next();
    };
  };

module.exports = {
  protect,
  branchAccess,
  onlyOwner,
  allowRoles
};
