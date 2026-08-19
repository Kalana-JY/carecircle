require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const moodRoutes = require("./src/routes/moodRoutes");
const journalRoutes = require("./src/routes/journalRoutes");
const forumRoutes = require("./src/routes/forumRoutes");
const peerSupporterRoutes = require("./src/routes/peerSupporterRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/moods", moodRoutes);
app.use("/api/journals", journalRoutes);
app.use("/api/forum", forumRoutes);
app.use("/api/peer-supporters", peerSupporterRoutes);
app.use("/api/resources", resourceRoutes);

// Base route for health check
app.get("/", (req, res) => {
  res.json({ message: "CareCircle API is running" });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
