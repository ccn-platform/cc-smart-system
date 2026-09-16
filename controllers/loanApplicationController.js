const mongoose = require("mongoose");

const LoanApplication = require("../models/loanApplication");
const CustomerIdentity = require("../models/CustomerIdentity");

// --------------------------------------------------
// Helpers
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

// --------------------------------------------------
// CREATE APPLICATION
// POST /api/loan-applications
//
// Hifadhi ombi tu.
// HAIUNDI DebtLoan.
// --------------------------------------------------

exports.createLoanApplication = async (req, res) => {
  try {
    const auth = getAuthContext(req);

    if (auth.error) {
      return res.status(401).json({
        success: false,
        message: auth.error
      });
    }

    const {
      customerId,
      requestedAmount,
      requestedTermDays,
      purpose
    } = req.body;

    if (!customerId || !isValidObjectId(customerId)) {
      return res.status(400).json({
        success: false,
        message: "customerId si sahihi."
      });
    }

    const amount = Number(requestedAmount);
    const termDays = Number(requestedTermDays);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Kiasi cha mkopo lazima kiwe zaidi ya sifuri."
      });
    }

    if (
      !Number.isInteger(termDays) ||
      termDays <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Muda wa mkopo lazima uwe idadi kamili ya siku iliyo zaidi ya sifuri."
      });
    }

    // Mteja lazima awe wa biashara hii.
    const customer = await CustomerIdentity.findOne({
      _id: customerId,
      owner: auth.ownerId
    }).select("_id owner fullName phone status");

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Mteja hajapatikana kwenye biashara hii."
      });
    }

    if (customer.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Mteja huyu hayuko kwenye hali ya active; ombi halijaundwa."
      });
    }

    const application = await LoanApplication.create({
      owner: auth.ownerId,
      branch: auth.branchId,

      customerId: customer._id,
      customerName: customer.fullName,
      customerPhone: customer.phone || "",

      requestedAmount: amount,
      requestedTermDays: termDays,
      purpose: typeof purpose === "string" ? purpose.trim() : "",

      status: "submitted",
      submittedAt: new Date(),
      submittedBy: auth.userId
    });

    return res.status(201).json({
      success: true,
      message: "Ombi la mkopo limehifadhiwa. Bado halijaidhinishwa na mkopo haujatengenezwa.",
      data: application
    });
  } catch (error) {
    console.error("createLoanApplication error:", error);

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kuhifadhi ombi la mkopo."
    });
  }
};

// --------------------------------------------------
// LIST APPLICATIONS
// GET /api/loan-applications
// Optional query: ?status=submitted&page=1&limit=20
// --------------------------------------------------

exports.getLoanApplications = async (req, res) => {
  try {
    const auth = getAuthContext(req);

    if (auth.error) {
      return res.status(401).json({
        success: false,
        message: auth.error
      });
    }

    const allowedStatuses = [
      "draft",
      "submitted",
      "under_review",
      "approved",
      "rejected",
      "cancelled",
      "converted"
    ];

    const filter = {
      owner: auth.ownerId,
      branch: auth.branchId
    };

    if (req.query.status) {
      if (!allowedStatuses.includes(req.query.status)) {
        return res.status(400).json({
          success: false,
          message: "Status iliyotumwa si sahihi."
        });
      }

      filter.status = req.query.status;
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit, 10) || 20, 1),
      100
    );

    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      LoanApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),

      LoanApplication.countDocuments(filter)
    ]);

    return res.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("getLoanApplications error:", error);

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kupata maombi ya mikopo."
    });
  }
};

// --------------------------------------------------
// GET ONE APPLICATION
// GET /api/loan-applications/:id
// --------------------------------------------------

exports.getLoanApplicationById = async (req, res) => {
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
        message: "ID ya ombi si sahihi."
      });
    }

    const application = await LoanApplication.findOne({
      _id: id,
      owner: auth.ownerId,
      branch: auth.branchId
    }).lean();

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Ombi halijapatikana kwenye biashara na tawi hili."
      });
    }

    return res.json({
      success: true,
      data: application
    });
  } catch (error) {
    console.error("getLoanApplicationById error:", error);

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kupata ombi la mkopo."
    });
  }
};

// --------------------------------------------------
// CANCEL APPLICATION
// PATCH /api/loan-applications/:id/cancel
//
// Inaruhusu kufuta ombi ambalo bado halijaamuliwa.
// HAIHUSU DebtLoan.
// --------------------------------------------------

exports.cancelLoanApplication = async (req, res) => {
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
        message: "ID ya ombi si sahihi."
      });
    }

    const application = await LoanApplication.findOne({
      _id: id,
      owner: auth.ownerId,
      branch: auth.branchId
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Ombi halijapatikana kwenye biashara na tawi hili."
      });
    }

    if (!["draft", "submitted"].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: "Ombi hili haliwezi kufutwa kwa sababu tayari limeanza kupitia hatua ya review au limeamuliwa."
      });
    }

    application.status = "cancelled";
    await application.save();

    return res.json({
      success: true,
      message: "Ombi limefutwa.",
      data: application
    });
  } catch (error) {
    console.error("cancelLoanApplication error:", error);

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kufuta ombi la mkopo."
    });
  }
};
