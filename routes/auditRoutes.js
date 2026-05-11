  const express =
  require("express");

const router =
  express.Router();

const {
  protect,
  branchAccess
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
  branchAccess,
  createManualAudit
);


// GET HISTORY
router.get(
  "/history",
  protect,
  branchAccess,
  getAuditHistory
);


// GET SINGLE AUDIT
router.get(
  "/:id",
  protect,
  branchAccess,
  getAuditById
);

module.exports =
  router;
