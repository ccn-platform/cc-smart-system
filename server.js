 require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;
const HOST = "0.0.0.0";

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, HOST, () => {
      console.log("=================================");
      console.log("🚀 CCN BACKEND STARTED");
      console.log("=================================");
      console.log("HOST:", HOST);
      console.log("PORT:", PORT);
      console.log(
        "URL:",
        `http://0.0.0.0:${PORT}`
      );
      console.log("=================================");
    });

    server.on("error", (error) => {
      console.error("❌ SERVER ERROR:", error);
    });

  } catch (error) {
    console.error(
      "❌ FAILED TO START SERVER:",
      error
    );

    process.exit(1);
  }
}

startServer();
