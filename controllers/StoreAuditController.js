const Shop =
  require("../models/Shop");

const {
  createAudit,
  getAudits,
  getAuditById
} = require(
  "../services/storeAuditService"
);

const uploadAuditVideo =
  async (
    req,
    res
  ) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({
            message:
              "Video required"
          });
      }

      const shop =
        await Shop.findOne({
          owner:
            req.ownerId
        });

      if (!shop) {
        return res
          .status(404)
          .json({
            message:
              "Shop not found"
          });
      }

      const audit =
        await createAudit({
          owner:
            req.ownerId,
          branch:
            req.branchId,
          shop:
            shop._id,
          videoUrl:
            req.file.path
        });

      res.status(201).json({
        message:
          "Audit uploaded",
        audit
      });

    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

const getAuditHistory =
  async (
    req,
    res
  ) => {
    try {
      const audits =
        await getAudits(
          req.ownerId,
          req.branchId
        );

      res.json(audits);

    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

const getSingleAudit =
  async (
    req,
    res
  ) => {
    try {
      const audit =
        await getAuditById(
          req.params.id,
          req.ownerId,
          req.branchId
        );

      if (!audit) {
        return res
          .status(404)
          .json({
            message:
              "Audit not found"
          });
      }

      res.json(audit);

    } catch (error) {
      res.status(500).json({
        message:
          error.message
      });
    }
  };

module.exports = {
  uploadAuditVideo,
  getAuditHistory,
  getSingleAudit
};
