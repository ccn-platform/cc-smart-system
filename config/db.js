 const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI_ATLAS);
    console.log("MongoDB Connected");
  } catch (error) {
    console.log(error.message);
  }
};

module.exports = connectDB;
