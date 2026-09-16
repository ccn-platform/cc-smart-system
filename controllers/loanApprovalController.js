  const mongoose = require("mongoose");

const LoanApplication = require("../models/loanApplication");
const LoanApproval = require("../models/loanApproval");
const CustomerIdentity = require("../models/CustomerIdentity");
const DebtLoan = require("../models/DebtLoan");

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

function makeLoanNumber() {
  return "LN" + Date.now() + Math.floor(Math.random() * 10000);
}

// --------------------------------------------------
// APPROVE OR REJECT APPLICATION
//
// POST /api/loan-applications/:id/decision
//
// Approval body:
// {
//   "decision": "approved",
//   "approvedAmount": 50000,
//   "approvedTermDays": 30,
//   "reason": ""
// }
//
// Rejection body:
// {
//   "decision": "rejected",
//   "reason": "Sababu ya kukataa"
// }
//
// Approval creates DebtLoan.
// Rejection does not create DebtLoan.
// --------------------------------------------------

exports.decideLoanApplication = async (req, res) => {
  const auth = getAuthContext(req);

  if (auth.error) {
    return res.status(401).json({
      success: false,
      message: auth.error
    });
  }

  const { id } = req.params;
  const {
    decision,
    approvedAmount,
    approvedTermDays,
    reason
  } = req.body;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      message: "ID ya ombi si sahihi."
    });
  }

  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({
      success: false,
      message: "decision lazima iwe approved au rejected."
    });
  }

  let amount;
  let termDays;

  if (decision === "approved") {
    amount = Number(approvedAmount);
    termDays = Number(approvedTermDays);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "approvedAmount lazima iwe zaidi ya sifuri."
      });
    }

    if (!Number.isInteger(termDays) || termDays <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "approvedTermDays lazima iwe idadi kamili ya siku iliyo zaidi ya sifuri."
      });
    }
  }

  let session;

  try {
    session = await mongoose.startSession();
    session.startTransaction();

    // Tafuta ombi ndani ya biashara na tawi la mtumiaji.
    const application = await LoanApplication.findOne({
      _id: id,
      owner: auth.ownerId,
      branch: auth.branchId
    }).session(session);

    if (!application) {
      await session.abortTransaction();

      return res.status(404).json({
        success: false,
        message: "Ombi halijapatikana kwenye biashara na tawi hili."
      });
    }

    // Zuia ombi lililoamuliwa au kugeuzwa mkopo kuamuliwa tena.
    if (!["submitted", "under_review"].includes(application.status)) {
      await session.abortTransaction();

      return res.status(409).json({
        success: false,
        message: `Ombi hili haliwezi kuamuliwa. Status yake ni ${application.status}.`
      });
    }

    let createdLoan = null;
    let customer = null;

    if (decision === "approved") {
      // Hakikisha ombi lina customerId halali.
      if (
        !application.customerId ||
        !mongoose.Types.ObjectId.isValid(
          String(application.customerId)
        )
      ) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message:
            "Ombi hili halina customerId halali. Fungua au rekebisha ombi kwa kumchagua mteja sahihi kwanza. Mkopo haujatengenezwa."
        });
      }

      // Hakikisha mteja ni wa biashara hii na bado yuko active.
      customer = await CustomerIdentity.findOne({
        _id: application.customerId,
        owner: auth.ownerId,
        status: "active"
      }).session(session);

      if (!customer) {
        await session.abortTransaction();

        return res.status(400).json({
          success: false,
          message:
            "Mteja wa ombi hili hajapatikana, si wa biashara hii, au hayuko active. Mkopo haujatengenezwa."
        });
      }

      // Tarehe ya mwisho = muda ulioidhinishwa kuanzia sasa.
      const approvalDate = new Date();
      const dueDate = new Date(approvalDate);
      dueDate.setDate(dueDate.getDate() + termDays);

      // Tengeneza mkopo.
      // DebtLoan.customer ndiyo field inayohifadhi CustomerIdentity ID.
      const loanDocs = await DebtLoan.create(
        [
          {
            owner: auth.ownerId,
            branch: auth.branchId,
            createdBy: auth.userId,

            customer: customer._id,

            loanNumber: makeLoanNumber(),

            principalAmount: amount,
            balanceAmount: amount,
            paidAmount: 0,
            dueDate,

            status: "active",
            approvedBy: auth.userId,
            approvalMethod: "manual",

            businessCategory: "",
            items: [],
            note: typeof reason === "string" ? reason.trim() : "",

            source: "online",
            syncStatus: "synced",
            lastSyncedAt: new Date()
          }
        ],
        { session }
      );

      createdLoan = loanDocs[0];

      // Sasisha counters za mteja ndani ya transaction hiyo hiyo.
      await CustomerIdentity.updateOne(
        {
          _id: customer._id,
          owner: auth.ownerId
        },
        {
          $inc: {
            totalLoans: 1,
            activeLoans: 1,
            totalBorrowed: amount
          }
        },
        { session }
      );
    }

    // Hifadhi rekodi ya uamuzi.
    const approvalDocs = await LoanApproval.create(
      [
        {
          owner: auth.ownerId,
          branch: auth.branchId,
          applicationId: application._id,

          decision,
          approvedAmount:
            decision === "approved" ? amount : undefined,
          approvedTermDays:
            decision === "approved" ? termDays : undefined,

          reason: typeof reason === "string" ? reason.trim() : "",
          decidedBy: auth.userId,
          decidedAt: new Date(),

          resultingLoanId: createdLoan
            ? createdLoan._id
            : undefined
        }
      ],
      { session }
    );

    // Sasisha ombi.
    application.status =
      decision === "approved" ? "converted" : "rejected";

    application.reviewedAt = new Date();
    application.reviewedBy = auth.userId;

    if (createdLoan) {
      application.resultingLoanId = createdLoan._id;
    }

    await application.save({ session });

    await session.commitTransaction();

    // Tengeneza object ya response yenye customerId inayoonekana
    // kwenye jibu la API. Database bado hutumia field "customer".
    let loanResponse = null;

    if (createdLoan) {
      loanResponse = createdLoan.toObject();

      loanResponse.customerId = String(createdLoan.customer);
    }

    return res.status(decision === "approved" ? 201 : 200).json({
      success: true,
      message:
        decision === "approved"
          ? "Ombi limeidhinishwa na mkopo umetengenezwa."
          : "Ombi limekataliwa.",

      data: {
        application,
        approval: approvalDocs[0],
        loan: loanResponse
      }
    });
  } catch (error) {
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }

    console.error("decideLoanApplication error:", error);

    // Duplicate loanNumber au hitilafu nyingine ya database.
    if (error && error.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Kuna mgongano wa namba ya mkopo. Tafadhali jaribu tena."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Imeshindikana kushughulikia uamuzi wa ombi."
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
