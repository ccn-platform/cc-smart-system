const CashEntry =
require("../models/CashEntry");


// CREATE ENTRY
 const createCashEntry =
async (req, res) => {
  try {
    const {
      branch,
      type,
      category,
      amount,
      paymentMethod,
      source,
      reference,
      note
    } = req.body;

    const finalAmount =
      Number(amount);

    if (
      !type ||
      !category?.trim() ||
      isNaN(finalAmount) ||
      finalAmount <= 0
    ) {
      return res.status(400).json({
        message:
          "Valid type, category and amount required"
      });
    }

    const entry =
      await CashEntry.create({
        user:
          req.user.id,
        branch:
          branch || null,
        type,
        category:
          category.trim(),
        amount:
          finalAmount,
        paymentMethod:
          paymentMethod ||
          "cash",
        source:
          source ||
          "manual",
        reference:
          reference || "",
        note:
          note || "",
        createdBy:
          req.user.id
      });

    res.status(201).json(entry);

  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};

// GET HISTORY
const getCashHistory =
async (req, res) => {
  try {
    const entries =
      await CashEntry.find({
        user:
          req.user.id,
        status:
          "active"
      })
      .sort({
        createdAt: -1
      });

    res.status(200).json(
      entries
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// GET SINGLE
const getCashById =
async (req, res) => {
  try {
    const entry =
      await CashEntry.findOne({
        _id:
          req.params.id,
        user:
          req.user.id
      });

    if (!entry) {
      return res.status(404).json({
        message:
          "Entry not found"
      });
    }

    res.status(200).json(
      entry
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// VOID ENTRY
const voidCashEntry =
async (req, res) => {
  try {
    const entry =
      await CashEntry.findOneAndUpdate(
        {
          _id:
            req.params.id,
          user:
            req.user.id
        },
        {
          status:
            "void"
        },
        {
          new: true
        }
      );

    if (!entry) {
      return res.status(404).json({
        message:
          "Entry not found"
      });
    }

    res.status(200).json(
      entry
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


module.exports = {
  createCashEntry,
  getCashHistory,
  getCashById,
  voidCashEntry
};