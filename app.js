     


 
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


// ==========================================
// GLOBAL MIDDLEWARE
// ==========================================

app.use(cors());
app.use(express.json());


// ==========================================
// REQUEST LOGGER
// ==========================================

app.use((req, res, next) => {
  console.log(
    "➡️ REQUEST:",
    req.method,
    req.url
  );

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
// CREDIT ONLINE INATAKIWA TU:
// 1.0.8 au zaidi.
//
// Hakuna developer bypass.
// Hakuna developer key.
// Kila mtu anafuata sheria hii.
//

const REQUIRED_CREDIT_VERSION = "1.0.9";


// ==========================================
// VERSION COMPARISON
// ==========================================

function compareVersions(
  currentVersion,
  requiredVersion
) {
  const current = String(
    currentVersion || "0.0.0"
  )
    .split(".")
    .map((value) => {
      const number = Number(value);

      return Number.isFinite(number)
        ? number
        : 0;
    });

  const required = String(
    requiredVersion || "0.0.0"
  )
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
    const currentPart = current[i] || 0;
    const requiredPart = required[i] || 0;

    if (currentPart > requiredPart) {
      return 1;
    }

    if (currentPart < requiredPart) {
      return -1;
    }
  }

  return 0;
}


// ==========================================
// APP VERSION CHECK
// ==========================================

app.get(
  "/api/app-version",
  (req, res) => {
    res.json({
      success: true,

      latestVersion:
        REQUIRED_CREDIT_VERSION,

      minimumVersion:
        REQUIRED_CREDIT_VERSION,

      forceUpdate: true,

      message:
        "Kuna toleo jipya la Biashara Plus lenye maboresho na marekebisho muhimu. Tafadhali nenda Play Store ufanye update ili kuendelea kutumia huduma za Online."
    });
  }
);


// ==========================================
// MY IP
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
// ADMIN
// ==========================================

app.use(
  "/",
  adminRoutes
);


// ==========================================
// OTHER ROUTES
// ==========================================

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
// CREDIT ONLINE VERSION ENFORCEMENT
// ==========================================
//
// Kila request ya:
//
// /api/credit/*
//
// lazima iwe na:
//
// x-app-version
//
// Version lazima iwe 1.0.8 au zaidi.
//
// Hakuna developer bypass.
//

const creditOnlineVersionCheck = (
  req,
  res,
  next
) => {

  const appVersion =
    req.headers["x-app-version"];


  // ----------------------------------------
  // APP VERSION HAIPO
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
        REQUIRED_CREDIT_VERSION,

      latestVersion:
        REQUIRED_CREDIT_VERSION,

      message:
        "Tafadhali fanya update ya Biashara Plus kupitia Play Store ili kutumia huduma za Online."
    });
  }


  // ----------------------------------------
  // VERSION CHECK
  // ----------------------------------------

  const comparison =
    compareVersions(
      appVersion,
      REQUIRED_CREDIT_VERSION
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
          REQUIRED_CREDIT_VERSION,

        method: req.method,

        url: req.originalUrl
      }
    );

    return res.status(426).json({
      success: false,

      updateRequired: true,

      offlineMode: true,

      currentVersion:
        String(appVersion),

      minimumVersion:
        REQUIRED_CREDIT_VERSION,

      latestVersion:
        REQUIRED_CREDIT_VERSION,

      message:
        "Toleo lako la Biashara Plus ni la zamani. Tafadhali nenda Play Store ufanye update ili kuendelea kutumia huduma za Online."
    });
  }


  // ----------------------------------------
  // VERSION ACCEPTED
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
// Hakuna developer key.
// Hakuna developer bypass.
//
// 1.0.7  → BLOCK
// 1.0.8  → ALLOW
// 1.0.9  → ALLOW
//
// ------------------------------------------

app.use(
  "/api/credit",
  creditOnlineVersionCheck,
  creditRoutes
);


// ==========================================
// REFERRALS
// ==========================================

app.use(
  "/api/referrals",
  referralRoutes
);


// ==========================================
// SUBSCRIPTION
// ==========================================

app.use(
  "/api/subscription",
  subscriptionRoutes
);


// ==========================================
// STORE AUDIT
// ==========================================

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
// EXPORT APP
// ==========================================

module.exports = app;
 
