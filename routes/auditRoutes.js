const express =
require("express");

const router =
express.Router();

const {
  protect
} = require(
  "../middleware/authMiddleware"
);

const {
  createManualAudit,
  getAuditHistory,
  getAuditById
} = require(
  "../controllers/auditController"
);


// CREATE MANUAL AUDIT
router.post(
  "/manual",
  protect,
  createManualAudit
);


// GET HISTORY
router.get(
  "/history",
  protect,
  getAuditHistory
);


// GET SINGLE AUDIT
router.get(
  "/:id",
  protect,
  getAuditById
);

module.exports =
router;
