  const StoreAudit =
  require("../models/StoreAudit");

const {
  updateAuditStatus,
  saveAnalysis
} = require(
  "./StoreAuditService"
);

const {
  extractFrames
} = require(
  "./videoFrameExtractor"
);

const {
  analyzeFrames
} = require(
  "./frameVisionAnalysisService"
);

const analyzeAudit =
  async (auditId) => {

    try {

      console.log(
        `🔍 Starting audit analysis: ${auditId}`
      );

      await updateAuditStatus(
        auditId,
        "processing"
      );

      const audit =
        await StoreAudit.findById(
          auditId
        );

      if (!audit) {
        throw new Error(
          "Audit not found"
        );
      }

      let frames = [];

      try {

        frames =
          await extractFrames(
            audit.videoUrl,
            audit._id
          );

        console.log(
          `📸 Frames extracted: ${frames.length}`
        );

      } catch (frameError) {

        console.error(
          "FRAME_EXTRACTION_ERROR:",
          frameError
        );
      }

      let visionResult = {

        visibleProducts: 0,

        visibleShelves: 0,

        shelfFillPercent: 0,

        estimatedInventoryValue: 0,

        estimatedLossValue: 0,

        riskScore: 50,

        summary:
          "No visual analysis available."
      };

      try {

        visionResult =
          await analyzeFrames(
            frames
          );

        console.log(
          "🧠 Vision Analysis:",
          visionResult
        );

      } catch (
        visionError
      ) {

        console.error(
          "VISION_ANALYSIS_ERROR:",
          visionError
        );
      }

      const confidenceScore =
        frames.length > 0
          ? 75
          : 60;

      const analysis = {

        summary:
          visionResult.summary,

        confidenceScore,

        riskScore:
          visionResult.riskScore,

        estimatedInventoryValue:
          visionResult.estimatedInventoryValue,

        estimatedLossValue:
          visionResult.estimatedLossValue,

        findings: [

          {
            title:
              "Visible Products",

            value:
              String(
                visionResult.visibleProducts
              ),

            confidence: 75
          },

          {
            title:
              "Visible Shelves",

            value:
              String(
                visionResult.visibleShelves
              ),

            confidence: 75
          },

          {
            title:
              "Shelf Fill Rate",

            value:
              `${visionResult.shelfFillPercent}%`,

            confidence: 70
          },

          {
            title:
              "Frames Processed",

            value:
              String(
                frames.length
              ),

            confidence: 100
          },

          {
            title:
              "Audit Status",

            value:
              "Completed",

            confidence: 100
          }

        ]
      };

      await saveAnalysis(
        auditId,
        analysis
      );

      console.log(
        `✅ Audit analysis completed: ${auditId}`
      );

      return analysis;

    } catch (error) {

      console.error(
        "AUDIT_ANALYSIS_ERROR:",
        error
      );

      try {

        await updateAuditStatus(
          auditId,
          "failed"
        );

      } catch (
        updateError
      ) {

        console.error(
          "AUDIT_STATUS_UPDATE_ERROR:",
          updateError
        );
      }

      throw error;
    }
  };

module.exports = {
  analyzeAudit
};
