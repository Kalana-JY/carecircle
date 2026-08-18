require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// Base route for health check
app.get("/", (req, res) => {
  res.json({ message: "CareCircle API is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
