const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = require("../config/db");
const BusinessCategory = require("../models/BusinessCategory");

const seed = async () => {
  try {
    await connectDB();

    await BusinessCategory.deleteMany();

    await BusinessCategory.insertMany([
      { name: "Retail Shop", code: "retail", sortOrder: 1 },
      { name: "Wholesale", code: "wholesale", sortOrder: 2 },
      { name: "Pharmacy", code: "pharmacy", sortOrder: 3 },
      { name: "Hardware", code: "hardware", sortOrder: 4 },
      { name: "Salon", code: "salon", sortOrder: 5 },
      { name: "Restaurant", code: "restaurant", sortOrder: 6 },
      { name: "Supermarket", code: "supermarket", sortOrder: 7 },
      { name: "Electronics", code: "electronics", sortOrder: 8 },
      { name: "Boutique", code: "boutique", sortOrder: 9 },
      { name: "Other", code: "other", sortOrder: 10 }
    ]);

    console.log("Business categories seeded");
    process.exit();
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
};

seed();