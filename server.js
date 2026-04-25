 require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");
const { markOverdueLoans } = require("./services/overdueService");
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
setInterval(() => {
  markOverdueLoans();
}, 60000);
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });

  } catch (error) {
    console.error("Startup failed:", error.message);
  }
};

startServer();
