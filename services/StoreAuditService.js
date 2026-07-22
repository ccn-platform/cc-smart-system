  const StoreAudit =
  require("../models/StoreAudit");

const createAudit =
  async (data) => {
    return StoreAudit.create(data);
  };

const getAudits =
  async (
    ownerId,
    branchId
  ) => {
    return StoreAudit.find({
      owner: ownerId,
      branch: branchId
    })
      .sort({
        createdAt: -1
      })
      .lean();
  };

const getAuditById =
  async (
    id,
    ownerId,
    branchId
  ) => {
    return StoreAudit.findOne({
      _id: id,
      owner: ownerId,
      branch: branchId
    }).lean();
  };

const updateAuditStatus =
  async (
    auditId,
    status
  ) => {

    return StoreAudit.findByIdAndUpdate(
      auditId,
      {
        status
      },
      {
        new: true
      }
    );
  };

const getPreviousCompletedAudit =
  async (
    shopId,
    currentAuditId
  ) => {

    return StoreAudit.findOne({
      shop: shopId,
      status: "completed",
      _id: {
        $ne: currentAuditId
      }
    })
      .sort({
        createdAt: -1
      })
      .lean();
  };

const saveAnalysis =
  async (
    auditId,
    analysis
  ) => {

    return StoreAudit.findByIdAndUpdate(
      auditId,
      {
        status:
          "completed",

        summary:
          analysis.summary,

        findings:
          analysis.findings,

        confidenceScore:
          analysis.confidenceScore,

        riskScore:
          analysis.riskScore,

        estimatedInventoryValue:
          analysis.estimatedInventoryValue,

        estimatedLossValue:
          analysis.estimatedLossValue,

        inventoryDifference:
          analysis.inventoryDifference || 0,

        lossDifference:
          analysis.lossDifference || 0,

        riskDifference:
          analysis.riskDifference || 0,

        comparedWithAudit:
          analysis.comparedWithAudit || null,

        analyzedAt:
          new Date()
      },
      {
        new: true
      }
    );
  };

module.exports = {
  createAudit,
  getAudits,
  getAuditById,
  updateAuditStatus,
  getPreviousCompletedAudit,
  saveAnalysis
};
