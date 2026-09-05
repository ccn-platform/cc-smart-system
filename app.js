  const express =
require("express");
const path = require("path");
const cors = require("cors");
 const axios = require("axios");
const {
  markOverdueLoans
} = require(
  "./services/overdueService"
);
const reportRoutes =require("./routes/reportRoutes");
 const subscriptionRoutes = require("./routes/subscriptionRoutes");
const cashRoutes =require("./routes/cashRoutes");
const auditRoutes =require("./routes/auditRoutes");
const orderRoutes =require("./routes/orderRoutes");
const shopRoutes =require("./routes/shopRoutes");
const authRoutes = require("./routes/authRoutes");
const metaRoutes = require("./routes/metaRoutes");
const productRoutes = require("./routes/productRoutes");
const salesRoutes =require("./routes/salesRoutes");
const creditRoutes =require("./routes/creditRoutes");
const referralRoutes = require("./routes/referralRoutes");
const aiRoutes =require("./routes/aiRoutes");
 const storeAuditRoutes =require("./routes/StoreAuditRoutes");

const adminRoutes =
  require("./routes/adminRoutes");
  const app = express();

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log("➡️ REQUEST:", req.method, req.url);
  next();
});
app.get("/", (req, res) => {
  res.send("CCN Backend Running");
});

 
/*
 * -----------------------------------------
 * APP VERSION CHECK
 * -----------------------------------------
 */

app.get(
  "/api/app-version",
  (req, res) => {

    res.json({
      latestVersion: "1.0.0",

      minimumVersion: "1.0.0",

      forceUpdate: false,

      message:
        "Kuna toleo jipya la Biashara Plus lenye maboresho na marekebisho muhimu."
    });

  }
);
 


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
app.use("/", adminRoutes);
app.use("/api/reports",reportRoutes);
app.use("/api/audit",auditRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales",salesRoutes);
app.use("/api/orders",orderRoutes);
app.use("/api/ai",aiRoutes);
app.use("/api/cash",cashRoutes);

// ==========================================
// CREDIT ONLINE MAINTENANCE MODE
// ==========================================

// false = Wateja wamezuiwa
// true  = Credit Online iko wazi kwa wote
const CREDIT_ONLINE_ENABLED = false;


// Developer access wakati wa maintenance
const developerCreditAccess = (
  req,
  res,
  next
) => {

  // Credit Online ikiwa wazi,
  // kila mtu anaendelea kawaida
  if (
    CREDIT_ONLINE_ENABLED
  ) {
    return next();
  }


  // Developer key kutoka request header
  const developerKey =
    req.headers[
      "x-developer-credit-key"
    ];


  // Ruhusu developer pekee
  if (
    developerKey &&
    developerKey ===
      process.env.DEVELOPER_CREDIT_KEY
  ) {
    return next();
  }


  console.log(
    "🚫 CREDIT ONLINE BLOCKED:",
    req.method,
    req.originalUrl
  );


  return res.status(503).json({

    success:
      false,

    offlineMode:
      true,

    message:
      "Huduma ya Credit Online imesimamishwa kwa muda kwa ajili ya marekebisho. Tafadhali endelea kutumia Offline Mode."

  });

};


// ==========================================
// CREDIT ROUTES
// ==========================================

app.use(
  "/api/credit",
  developerCreditAccess,
  creditRoutes
);
 
app.use("/api/referrals",referralRoutes);
app.use("/api/subscription", subscriptionRoutes);
 app.use("/api/store-audit",storeAuditRoutes);
setInterval(() => {
  markOverdueLoans();
}, 60000);
module.exports = app;
