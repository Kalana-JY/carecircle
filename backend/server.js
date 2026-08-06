require("dotenv").config();
const express = require("express");
const connectDB = require("./src/config/db");

const app = express();
const PORT = process.env.PORT;

// Connect to the database
connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});