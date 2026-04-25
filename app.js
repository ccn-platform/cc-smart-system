const express =
require("express");
const cors = require("cors");
 
const reportRoutes =require("./routes/reportRoutes");
const cashRoutes =require("./routes/cashRoutes");
const auditRoutes =require("./routes/auditRoutes");
const orderRoutes =require("./routes/orderRoutes");
const shopRoutes =require("./routes/shopRoutes");
const authRoutes = require("./routes/authRoutes");
const metaRoutes = require("./routes/metaRoutes");
const productRoutes = require("./routes/productRoutes");
const salesRoutes =require("./routes/salesRoutes");
const creditRoutes =require("./routes/creditRoutes");
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("CCN Backend Running");
});

app.use("/api/reports",reportRoutes);
app.use("/api/audit",auditRoutes);
app.use("/api/shop", shopRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/meta", metaRoutes);
app.use("/api/products", productRoutes);
app.use("/api/sales",salesRoutes);
app.use("/api/orders",orderRoutes);
app.use("/api/cash",cashRoutes);
app.use("/api/credit",creditRoutes);
 
module.exports = app;
