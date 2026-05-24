  const CashEntry =
  require("../models/CashEntry");


// CREATE ENTRY
const createCashEntry =
  async (req, res) => {
    try {
      const {
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
          owner:
            req.ownerId,

          branch:
            req.branchId,

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

      return res.status(201).json(
        entry
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// GET HISTORY
 const getCashHistory =
  async (req, res) => {
    try {
      const period =
        req.query.period ||
        "today";

      let start =
        new Date();

      let end =
        new Date();

      if (
        period ===
        "today"
      ) {
        start =
          new Date();

        start.setUTCHours(
          0,
          0,
          0,
          0
        );
      }

      if (
        period ===
        "week"
      ) {
        start =
          new Date();

        start.setUTCHours(
          0,
          0,
          0,
          0
        );

        const day =
          start.getUTCDay();

        const diff =
          day === 0
            ? 6
            : day - 1;

        start.setUTCDate(
          start.getUTCDate() -
            diff
        );
      }

      if (
        period ===
        "month"
      ) {
        start =
          new Date(
            Date.UTC(
              end.getUTCFullYear(),
              end.getUTCMonth(),
              1
            )
          );
      }

      const entries =
        await CashEntry.find({
          owner:
            req.ownerId,

          branch:
            req.branchId,

          status:
            "active",

          createdAt: {
            $gte: start,
            $lte: end
          }
        }).sort({
          createdAt: -1
        });

      return res.status(200).json(
        entries
      );

    } catch (error) {
      return res.status(500).json({
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

          owner:
            req.ownerId,

          branch:
            req.branchId
        });

      if (!entry) {
        return res.status(404).json({
          message:
            "Entry not found"
        });
      }

      return res.status(200).json(
        entry
      );

    } catch (error) {
      return res.status(500).json({
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

            owner:
              req.ownerId,

            branch:
              req.branchId
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

      return res.status(200).json(
        entry
      );

    } catch (error) {
      return res.status(500).json({
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
