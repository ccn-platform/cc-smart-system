const Audit =
require("../models/Audit");

const Product =
require("../models/Product");


// CREATE MANUAL AUDIT
const createManualAudit =
async (req, res) => {
  try {
    const {
      items,
      branch,
      note
    } = req.body;

    if (
      !items ||
      !Array.isArray(
        items
      ) ||
      items.length === 0
    ) {
      return res.status(400).json({
        message:
          "Items required"
      });
    }

    const results = [];

    let shortageCount = 0;
    let excessCount = 0;

    let totalLossValue = 0;
    let totalGainValue = 0;

    for (
      let i = 0;
      i < items.length;
      i++
    ) {
      const row =
        items[i];

      const product =
        await Product.findOne({
          _id:
            row.product,
          user:
            req.user.id
        });

      if (!product)
        continue;

      const systemQty =
        product.stockQty;

      const countedQty =
        Number(
          row.countedQty
        ) || 0;

      const difference =
        countedQty -
        systemQty;

      let lossValue = 0;
      let gainValue = 0;

      if (
        difference < 0
      ) {
        shortageCount++;

        lossValue =
          Math.abs(
            difference
          ) *
          product.buyPrice;

        totalLossValue +=
          lossValue;
      }

      if (
        difference > 0
      ) {
        excessCount++;

        gainValue =
          difference *
          product.buyPrice;

        totalGainValue +=
          gainValue;
      }

      results.push({
        product:
          product._id,
        name:
          product.name,
        systemQty,
        countedQty,
        difference,
        buyPrice:
          product.buyPrice,
        sellPrice:
          product.sellPrice,
        lossValue,
        gainValue
      });
    }

    const audit =
      await Audit.create({
        user:
          req.user.id,
        branch:
          branch ||
          null,
        method:
          "manual",
        status:
          "completed",
        items:
          results,
        totalItems:
          results.length,
        shortageCount,
        excessCount,
        totalLossValue,
        totalGainValue,
        note:
          note || ""
      });

    res.status(201).json(
      audit
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// GET HISTORY
const getAuditHistory =
async (req, res) => {
  try {
    const audits =
      await Audit.find({
        user:
          req.user.id
      })
      .sort({
        createdAt: -1
      })
      .select(
        "_id method totalItems shortageCount excessCount totalLossValue totalGainValue createdAt"
      );

    res.status(200).json(
      audits
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


// GET SINGLE AUDIT
const getAuditById =
async (req, res) => {
  try {
    const audit =
      await Audit.findOne({
        _id:
          req.params.id,
        user:
          req.user.id
      });

    if (!audit) {
      return res.status(404).json({
        message:
          "Audit not found"
      });
    }

    res.status(200).json(
      audit
    );
  } catch (error) {
    res.status(500).json({
      message:
        error.message
    });
  }
};


module.exports = {
  createManualAudit,
  getAuditHistory,
  getAuditById
};