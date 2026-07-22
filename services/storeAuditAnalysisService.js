  const StoreAudit =
  require("../models/StoreAudit");

 const {
  updateAuditStatus,
  saveAnalysis,
  getPreviousCompletedAudit
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
          "Hakuna uchambuzi wa picha uliopatikana."
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
let inventoryDifference = 0;
let lossDifference = 0;
let riskDifference = 0;
let comparedWithAudit = null;

try {

  const previousAudit =
    await getPreviousCompletedAudit(
      audit.shop,
      audit._id
    );

  if (previousAudit) {

    comparedWithAudit =
      previousAudit._id;

    inventoryDifference =
      visionResult.estimatedInventoryValue -
      (
        previousAudit.estimatedInventoryValue ||
        0
      );

    lossDifference =
      visionResult.estimatedLossValue -
      (
        previousAudit.estimatedLossValue ||
        0
      );

    riskDifference =
      visionResult.riskScore -
      (
        previousAudit.riskScore ||
        0
      );
  }

} catch (comparisonError) {

  console.error(
    "AUDIT_COMPARISON_ERROR:",
    comparisonError
  );
}

      const confidenceScore =
        frames.length > 0
          ? 75
          : 60;

         const hasPreviousAudit =
             !!comparedWithAudit;
         const findings = [

  {
    title:
      "Bidhaa Zilizoonekana",

    value:
      String(
        visionResult.visibleProducts
      ),

    confidence: 75
  },

  {
    title:
      "Rafu Zilizoonekana",

    value:
      String(
        visionResult.visibleShelves
      ),

    confidence: 75
  },

  {
    title:
      "Asilimia ya Ujazaji wa Rafu",

    value:
      `${visionResult.shelfFillPercent}%`,

    confidence: 70
  }

];    

if (hasPreviousAudit) {

  findings.push(

    {
      title:
        "Mabadiliko ya Stock",

      value:
        inventoryDifference >= 0
          ? `Imeongezeka TZS ${inventoryDifference.toLocaleString()}`
          : `Imepungua TZS ${Math.abs(inventoryDifference).toLocaleString()}`,

      confidence: 90
    },

    {
      title:
        "Mabadiliko ya Hasara",

      value:
        lossDifference >= 0
          ? `Imeongezeka TZS ${lossDifference.toLocaleString()}`
          : `Imepungua TZS ${Math.abs(lossDifference).toLocaleString()}`,

      confidence: 90
    },

    {
      title:
        "Mabadiliko ya Hatari",

      value:
        riskDifference >= 0
          ? `Hatari imeongezeka kwa ${riskDifference}%`
          : `Hatari imepungua kwa ${Math.abs(riskDifference)}%`,

      confidence: 90
    },

    {
      title:
        "Audit Iliyolinganishwa",

      value:
        String(
          comparedWithAudit
        ),

      confidence: 100
    }

  );

} else {

  findings.push({

    title:
      "Ulinganisho",

    value:
      "Hakuna audit ya awali ya kulinganisha.",

    confidence: 100

  });

}
findings.push(

  {
    title:
      "Fremu Zilizochambuliwa",

    value:
      String(
        frames.length
      ),

    confidence: 100
  },

  {
    title:
      "Hali ya Ukaguzi",

    value:
      "Imekamilika",

    confidence: 100
  }

);
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

          inventoryDifference,

           lossDifference,

           riskDifference,

            comparedWithAudit,
           findings
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
