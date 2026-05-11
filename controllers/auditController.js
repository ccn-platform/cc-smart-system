  const Audit =
  require("../models/Audit");

const Product =
  require("../models/Product");


// CREATE MANUAL AUDIT
const createManualAudit =
  async (req, res) => {
    try {
      if (
        !req.ownerId ||
        !req.branchId
      ) {
        return res.status(401).json({
          message:
            "Unauthorized"
        });
      }

      const {
        items,
        note
      } = req.body;

      if (
        !items ||
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          message:
            "Items required"
        });
      }

      const productIds =
        items.map(
          (i) => i.product
        );

      const products =
        await Product.find({
          _id: {
            $in:
              productIds
          },
          owner:
            req.ownerId,
          branch:
            req.branchId,
          isActive: true
        });

      const productMap = {};

      products.forEach((p) => {
        productMap[
          p._id.toString()
        ] = p;
      });

      const results = [];

      let shortageCount = 0;
      let excessCount = 0;

      let totalLossValue = 0;
      let totalGainValue = 0;

      for (const row of items) {
        const product =
          productMap[
            row.product
          ];

        if (!product)
          continue;

        const systemQty =
          Number(
            product.stockQty
          ) || 0;

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
          owner:
            req.ownerId,

          createdBy:
            req.user.id,

          branch:
            req.branchId,

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

      return res.status(201).json(
        audit
      );

    } catch (error) {
      console.log(
        "AUDIT ERROR:",
        error
      );

      return res.status(500).json({
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
          owner:
            req.ownerId,

          branch:
            req.branchId
        })
          .sort({
            createdAt: -1
          })
          .select(
            "_id method totalItems shortageCount excessCount totalLossValue totalGainValue createdAt"
          )
          .lean();

      return res.status(200).json(
        audits
      );

    } catch (error) {
      return res.status(500).json({
        message:
          error.message
      });
    }
  };


// GET SINGLE
const getAuditById =
  async (req, res) => {
    try {
      const audit =
        await Audit.findOne({
          _id:
            req.params.id,

          owner:
            req.ownerId,

          branch:
            req.branchId
        }).lean();

      if (!audit) {
        return res.status(404).json({
          message:
            "Audit not found"
        });
      }

      return res.status(200).json(
        audit
      );

    } catch (error) {
      return res.status(500).json({
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
