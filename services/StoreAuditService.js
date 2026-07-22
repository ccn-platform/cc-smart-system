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

module.exports = {
  createAudit,
  getAudits,
  getAuditById
};
