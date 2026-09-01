   require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/db");

// connect database
connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
