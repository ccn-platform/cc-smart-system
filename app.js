 ```js
const express = require("express");
const path = require("path");
const cors = require("cors");
const axios = require("axios");

const {
  markOverdueLoans
} = require("./services/overdueService");

const reportRoutes = require("./routes/reportRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");
const cashRoutes = require("./routes/cashRoutes");
const auditRoutes = require("./routes/auditRoutes");
const orderRoutes = require("./routes/orderRoutes");
const loanApplicationRoutes = require("./routes/loanApplicationRoutes");
const loanApprovalRoutes = require("./routes/loanApprovalRoutes");
const shopRoutes = require("./routes/shopRoutes");
const loanSecurityRoutes = require("./routes/loanSecurityRoutes");
const authRoutes = require("./routes/authRoutes");
const metaRoutes = require("./routes/metaRoutes");
const productRoutes = require("./routes/productRoutes");
const salesRoutes = require("./routes/salesRoutes");
const creditRoutes = require("./routes/creditRoutes");
const referralRoutes = require("./routes/referralRoutes");
const aiRoutes = require("./routes/aiRoutes");
const storeAuditRoutes = require("./routes/StoreAuditRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

app.use(cors());
app.use(express.json());


// ==========================================
// REQUEST LOGGER
// ==========================================

app.use((req, res, next) => {
  console.log("➡️ REQUEST:", req.method, req.url);
  next();
});


// ==========================================
// ROOT
// ==========================================

app.get("/", (req, res) => {
  res.send("CCN Backend Running");
});


// ==========================================
// APP VERSION CONFIGURATION
// ==========================================
//
// HII NDIYO VERSION INAYORUHUSIWA
// APP YA CHINI YA 1.0.8 ITATAKIWA UPDATE
//
// Developer pia lazima afanye update.
// Hakuna developer bypass.
//

const REQUIRED_APP_VERSION = "1.0.8";


// ==========================================
// VERSION COMPARISON
// ==========================================

function compareVersions(currentVersion, requiredVersion) {

  const current = String(currentVersion || "0.0.0")
    .split(".")
    .map((value) => {
      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : 0;
    });

  const required = String(requiredVersion || "0.0.0")
    .split(".")
    .map((value) => {
      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : 0;
    });

  const length = Math.max(
    current.length,
    required.length,
    3
  );

  for (let i = 0; i < length; i++) {

    const currentPart =
      current[i] || 0;

    const requiredPart =
      required[i] || 0;

    if (
      currentPart >
      requiredPart
    ) {
      return 1;
    }

    if (
      currentPart <
      requiredPart
    ) {
      return -1;
    }
  }

  return 0;
}


// ==========================================
// APP VERSION CHECK API
// ==========================================
//
// Mobile app itaita endpoint hii
// wakati wa kuanza app.
//
// Mfano:
//
// GET /api/app-version
//
// Inarudisha:
// latestVersion: 1.0.8
// minimumVersion: 1.0.8
// forceUpdate: true
//

app.get(
  "/api/app-version",
  (req, res) => {

    res.json({

      success: true,

      latestVersion:
        REQUIRED_APP_VERSION,

      minimumVersion:
        REQUIRED_APP_VERSION,

      forceUpdate: true,

      message:
        "Kuna toleo jipya la Biashara Plus lenye maboresho na marekebisho muhimu. Tafadhali nenda Play Store ufanye update ili kuendelea kutumia app."
    });

  }
);


// ==========================================
// PUBLIC IP
// ==========================================

app.get(
  "/my-ip",
  async (req, res) => {

    try {

      const response =
        await axios.get(
          "https://api.ipify.org?format=json"
        );

      res.json({
        ip: response.data.ip
      });

    } catch (error) {

      res.status(500).json({
        error: error.message
      });

    }

  }
);


// ==========================================
// PRIVACY POLICY
// ==========================================

app.get(
  "/privacy-policy",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "views",
        "privacy-policy.html"
      )
    );

  }
);


// ==========================================
// NORMAL ROUTES
// ==========================================

app.use("/", adminRoutes);

app.use(
  "/api/reports",
  reportRoutes
);

app.use(
  "/api/audit",
  auditRoutes
);

app.use(
  "/api/shop",
  shopRoutes
);

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/meta",
  metaRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/sales",
  salesRoutes
);

app.use(
  "/api/orders",
  orderRoutes
);

app.use(
  "/api/ai",
  aiRoutes
);

app.use(
  "/api/cash",
  cashRoutes
);

app.use(
  "/api/loan-applications",
  loanApplicationRoutes
);

app.use(
  "/api/loan-approvals",
  loanApprovalRoutes
);

app.use(
  "/api/loan-securities",
  loanSecurityRoutes
);


// ==========================================
// CREDIT ONLINE VERSION PROTECTION
// ==========================================
//
// MUHIMU:
//
// Hakuna developer key.
// Hakuna developer bypass.
// Hakuna user bypass.
//
// App ya zamani:
// 1.0.7
//
// Itazuiwa.
//
// App mpya:
// 1.0.8
//
// Itaendelea.
//
// Developer akiwa na 1.0.7:
// ATAZUIWA PIA.
//

const creditOnlineVersionCheck = (
  req,
  res,
  next
) => {

  const appVersion =
    req.headers["x-app-version"];


  // ----------------------------------------
  // VERSION HAIJATUMWA
  // ----------------------------------------

  if (!appVersion) {

    console.log(
      "🚫 CREDIT BLOCKED: APP VERSION MISSING",
      {
        method: req.method,
        url: req.originalUrl
      }
    );

    return res.status(426).json({

      success: false,

      updateRequired: true,

      offlineMode: true,

      currentVersion: null,

      minimumVersion:
        REQUIRED_APP_VERSION,

      latestVersion:
        REQUIRED_APP_VERSION,

      message:
        "Tafadhali fanya update ya Biashara Plus kupitia Play Store ili kutumia huduma za Online."

    });
  }


  // ----------------------------------------
  // COMPARE VERSION
  // ----------------------------------------

  const comparison =
    compareVersions(
      appVersion,
      REQUIRED_APP_VERSION
    );


  // ----------------------------------------
  // OLD VERSION
  // ----------------------------------------

  if (comparison < 0) {

    console.log(
      "🚫 CREDIT BLOCKED: OLD APP VERSION",
      {
        currentVersion:
          String(appVersion),

        requiredVersion:
          REQUIRED_APP_VERSION,

        method:
          req.method,

        url:
          req.originalUrl
      }
    );

    return res.status(426).json({

      success: false,

      updateRequired: true,

      offlineMode: true,

      currentVersion:
        String(appVersion),

      minimumVersion:
        REQUIRED_APP_VERSION,

      latestVersion:
        REQUIRED_APP_VERSION,

      message:
        "Toleo lako la Biashara Plus ni la zamani. Tafadhali nenda Play Store ufanye update ili kuendelea kutumia huduma za Online."

    });
  }


  // ----------------------------------------
  // VERSION INARUHUSIWA
  // ----------------------------------------

  console.log(
    "✅ CREDIT VERSION ACCEPTED:",
    String(appVersion)
  );

  return next();
};


// ==========================================
// CREDIT ROUTES
// ==========================================
//
// KILA REQUEST YA CREDIT
// lazima ipitie version check.
//
// Hakuna developer bypass.
//

app.use(
  "/api/credit",
  creditOnlineVersionCheck,
  creditRoutes
);


// ==========================================
// OTHER ROUTES
// ==========================================

app.use(
  "/api/referrals",
  referralRoutes
);

app.use(
  "/api/subscription",
  subscriptionRoutes
);

app.use(
  "/api/store-audit",
  storeAuditRoutes
);


// ==========================================
// OVERDUE LOANS
// ==========================================

setInterval(() => {

  markOverdueLoans();

}, 60000);


// ==========================================
// EXPORT
// ==========================================

module.exports = app;
```
