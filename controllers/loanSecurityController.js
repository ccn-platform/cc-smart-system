
const mongoose = require("mongoose");

const LoanSecurity = require("../models/loanSecurity");
const DebtLoan = require("../models/DebtLoan");
const LoanApplication = require("../models/loanApplication");

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

function getAuthContext(req) {
  const ownerId = req.ownerId;
  const branchId = req.branchId;
  const userId = req.user && (req.user.id || req.user._id);

  if (!ownerId || !branchId || !userId) {
    return {
      error: "Taarifa za mtumiaji, biashara au tawi hazijakamilika."
    };
  }

  if (
    !mongoose.Types.ObjectId.isValid(ownerId) ||
    !mongoose.Types.ObjectId.isValid(branchId) ||
    !mongoose.Types.ObjectId.isValid(userId)
  ) {
    return {
      error: "Taarifa za authentication si sahihi."
    };
  }

  return { ownerId, branchId, userId };
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function cleanString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function applyAllowedFields(document, body) {
  // Aina ya rekodi haibadilishwi wakati wa update.
  if (document.type === "guarantor") {
    if (body.guarantor && typeof body.guarantor === "object") {
      const fields = ["name", "phone", "relationship", "location"];

      for (const field of fields) {
        if (body.guarantor[field] !== undefined) {
          document.guarantor[field] = cleanString(
            body.guarantor[field]
          );
        }
      }
    }
  }

  if (document.type === "collateral") {
    if (body.collateral && typeof body.collateral === "object") {
      const fields = ["type", "description", "currency"];

      for (const field of fields) {
        if (body.collateral[field] !== undefined) {
          document.collateral[field] = cleanString(
            body.collateral[field]
          );
        }
      }

      if (body.collateral.estimatedValue !== undefined) {
        const value = body.collateral.estimatedValue;

        if (value === null || value === "") {
          document.collateral.estimatedValue = null;
        } else {
          document.collateral.estimatedValue = Number(value);
        }
      }
    }
  }
}

async function parentBelongsToBranch({
  type,
  parentId,
  ownerId,
  branchId
}) {
  if (!isValidObjectId(parentId)) {
    return false;
  }

  const Model =
    type === "loan" ? DebtLoan : LoanApplication;

  const parent = await Model.findOne({
    _id: parentId,
    owner: ownerId,
    branch: branchId
  }).select("_id");

  return Boolean(parent);
}

function handleValidationError(error, res) {
  if (error && error.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  return null;
}

// --------------------------------------------------
// CREATE SECURITY
// POST /api/loan-securities
//
// Body example for guarantor:
// {
//   "type": "guarantor",
//   "applicationId": "...",
//   "guarantor": {
//     "name": "Juma",
//     "phone": "07XXXXXXXX",
//     "relationship": "Ndugu",
//     "location": "Dar es Salaam"
//   }
// }
//
// Use loanId instead of applicationId for an existing loan.
// --------------------------------------------------

exports.createLoanSecurity = async (req, res) => {
  try {
    const auth = getAuthContext(req);

    if (auth.error) {
      return res.status(401).json({
        success: false,
        message: auth.error
      });
    }

    const {
      type,
      loanId,
      applicationId,
      guarantor,
      collateral
    } = req.body;

    if (!["guarantor", "collateral"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "type lazima iwe guarantor au collateral."
      });
    }

    // Model inaruhusu loanId AU applicationId pekee.
    const hasLoanId = Boolean(loanId);
    const hasApplicationId = Boolean(applicationId);

    if (hasLoanId === hasApplicationId) {
      return res.status(400).json({
        success: false,
        message: "Tuma loanId au applicationId pekee, si vyote."
      });
    }

    const parentType = hasLoanId ? "loan" : "application";
    const parentId = hasLoanId ? loanId : applicationId;

    const parentExists = await parentBelongsToBranch({
      type: parentType,
      parentId,
      ownerId: auth.ownerId,
      branchId: auth.branchId
    });

    if (!parentExists) {
      return res.status(404).json({
        success: false,
        message: "Mkopo au ombi halijapatikana kwenye biashara na tawi hili."
      });
    }

    const securityData = {
      owner: auth.ownerId,
      branch: auth.branchId,
      loanId: hasLoanId ? loanId : null,
      applicationId: hasApplicationId ? applicationId : null,
      type,
      createdBy: auth.userId
    };

    if (type === "guarantor") {
      securityData.guarantor = {
        name: cleanString(guarantor?.name),
        phone: cleanString(guarantor?.phone),
        relationship: cleanString(guarantor?.relationship),
        location: cleanString(guarantor?.location)
      };
    }

    if (type === "collateral") {
      const estimatedValue =
        collateral?.estimatedValue === undefined ||
        collateral?.estimatedValue === null ||
        collateral?.estimatedValue === ""
          ? null
          : Number(collateral.estimatedValue);

      securityData.collateral = {
        type: cleanString(collateral?.type),
        description: cleanString(collateral?.description),
        estimatedValue,
        currency: cleanString(collateral?.currency) || "TZS"
      };
    }

    const security = await LoanSecurity.create(securityData);

    return res.status(201).json({
      success: true,
      message: "Taarifa za dhamana zimehifadhiwa.",
      data: security
    });
  } catch (error) {
    console.error("createLoanSecurity error:", error);

    const validationResponse = handleValidationError(error, res);
    if (validationResponse) return validationResponse;

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kuhifadhi taarifa za dhamana."
    });
  }
};

// --------------------------------------------------
// LIST SECURITIES
// GET /api/loan-securities
//
// Optional query:
// ?loanId=... OR ?applicationId=...
// ?type=guarantor
// ?status=active
// ?page=1&limit=20
// --------------------------------------------------

exports.getLoanSecurities = async (req, res) => {
  try {
    const auth = getAuthContext(req);

    if (auth.error) {
      return res.status(401).json({
        success: false,
        message: auth.error
      });
    }

    const filter = {
      owner: auth.ownerId,
      branch: auth.branchId,
      deletedAt: null
    };

    if (req.query.loanId) {
      if (!isValidObjectId(req.query.loanId)) {
        return res.status(400).json({
          success: false,
          message: "loanId si sahihi."
        });
      }

      filter.loanId = req.query.loanId;
    }

    if (req.query.applicationId) {
      if (!isValidObjectId(req.query.applicationId)) {
        return res.status(400).json({
          success: false,
          message: "applicationId si sahihi."
        });
      }

      filter.applicationId = req.query.applicationId;
    }

    if (req.query.loanId && req.query.applicationId) {
      return res.status(400).json({
        success: false,
        message: "Tumia loanId au applicationId pekee."
      });
    }

    if (req.query.type) {
      if (!["guarantor", "collateral"].includes(req.query.type)) {
        return res.status(400).json({
          success: false,
          message: "type si sahihi."
        });
      }

      filter.type = req.query.type;
    }

    if (req.query.status) {
      if (!["active", "released"].includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "status si sahihi."
        });
      }

      filter.status = req.query.status;
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );

    const [securities, total] = await Promise.all([
      LoanSecurity.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      LoanSecurity.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: securities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("getLoanSecurities error:", error);

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kupata taarifa za dhamana."
    });
  }
};

// --------------------------------------------------
// GET ONE SECURITY
// GET /api/loan-securities/:id
// --------------------------------------------------

exports.getLoanSecurityById = async (req, res) => {
  try {
    const auth = getAuthContext(req);

    if (auth.error) {
      return res.status(401).json({
        success: false,
        message: auth.error
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID ya dhamana si sahihi."
      });
    }

    const security = await LoanSecurity.findOne({
      _id: id,
      owner: auth.ownerId,
      branch: auth.branchId,
      deletedAt: null
    }).lean();

    if (!security) {
      return res.status(404).json({
        success: false,
        message: "Taarifa za dhamana hazijapatikana."
      });
    }

    return res.json({
      success: true,
      data: security
    });
  } catch (error) {
    console.error("getLoanSecurityById error:", error);

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kupata taarifa za dhamana."
    });
  }
};

// --------------------------------------------------
// UPDATE SECURITY
// PATCH /api/loan-securities/:id
//
// Inasasisha fields za aina iliyopo tu.
// Haiwezi kubadilisha owner, branch, loanId,
// applicationId, type au createdBy.
// --------------------------------------------------

exports.updateLoanSecurity = async (req, res) => {
  try {
    const auth = getAuthContext(req);

    if (auth.error) {
      return res.status(401).json({
        success: false,
        message: auth.error
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID ya dhamana si sahihi."
      });
    }

    const security = await LoanSecurity.findOne({
      _id: id,
      owner: auth.ownerId,
      branch: auth.branchId,
      deletedAt: null
    });

    if (!security) {
      return res.status(404).json({
        success: false,
        message: "Taarifa za dhamana hazijapatikana."
      });
    }

    if (security.status !== "active") {
      return res.status(409).json({
        success: false,
        message: "Dhamana iliyoachiliwa haiwezi kusasishwa."
      });
    }

    applyAllowedFields(security, req.body);
    security.updatedBy = auth.userId;

    await security.save();

    return res.json({
      success: true,
      message: "Taarifa za dhamana zimesasishwa.",
      data: security
    });
  } catch (error) {
    console.error("updateLoanSecurity error:", error);

    const validationResponse = handleValidationError(error, res);
    if (validationResponse) return validationResponse;

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kusasisha taarifa za dhamana."
    });
  }
};

// --------------------------------------------------
// RELEASE SECURITY
// PATCH /api/loan-securities/:id/release
//
// Huweka status kuwa released; haifuti rekodi.
// --------------------------------------------------

exports.releaseLoanSecurity = async (req, res) => {
  try {
    const auth = getAuthContext(req);

    if (auth.error) {
      return res.status(401).json({
        success: false,
        message: auth.error
      });
    }

    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "ID ya dhamana si sahihi."
      });
    }

    const security = await LoanSecurity.findOne({
      _id: id,
      owner: auth.ownerId,
      branch: auth.branchId,
      deletedAt: null
    });

    if (!security) {
      return res.status(404).json({
        success: false,
        message: "Taarifa za dhamana hazijapatikana."
      });
    }

    if (security.status === "released") {
      return res.status(409).json({
        success: false,
        message: "Dhamana hii tayari imeachiliwa."
      });
    }

    security.status = "released";
    security.updatedBy = auth.userId;

    await security.save();

    return res.json({
      success: true,
      message: "Dhamana imeachiliwa.",
      data: security
    });
  } catch (error) {
    console.error("releaseLoanSecurity error:", error);

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kuachilia dhamana."
    });
  }
};
