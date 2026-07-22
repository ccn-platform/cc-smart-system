  const Shop =
  require("../models/Shop");

const {
  createAudit,
  getAudits,
  getAuditById
} = require(
  "../services/StoreAuditService"
);

const {
  analyzeAudit
} = require(
  "../services/storeAuditAnalysisService"
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
            req.file.path,

          status:
            "pending"
        });

      // BACKGROUND ANALYSIS
      analyzeAudit(
        audit._id
      ).catch(error => {
        console.error(
          "AUDIT_BACKGROUND_ANALYSIS_ERROR:",
          error
        );
      });

      res.status(201).json({
        success: true,

        message:
          "Audit uploaded successfully",

        audit
      });

    } catch (error) {

      console.error(
        "UPLOAD_AUDIT_ERROR:",
        error
      );

      res.status(500).json({
        success: false,

        message:
          error.message ||
          "Failed to upload audit"
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

      res.json({
        success: true,
        count:
          audits.length,
        audits
      });

    } catch (error) {

      console.error(
        "GET_AUDIT_HISTORY_ERROR:",
        error
      );

      res.status(500).json({
        success: false,

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
            success: false,

            message:
              "Audit not found"
          });
      }

      res.json({
        success: true,
        audit
      });

    } catch (error) {

      console.error(
        "GET_SINGLE_AUDIT_ERROR:",
        error
      );

      res.status(500).json({
        success: false,

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
