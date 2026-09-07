require("dotenv").config(); // local admin credentials load from .env
const express = require("express");
const cors = require("cors");
const connectDB = require("./src/config/db");
const authRoutes = require("./src/routes/authRoutes");
const moodRoutes = require("./src/routes/moodRoutes");
const journalRoutes = require("./src/routes/journalRoutes");
const forumRoutes = require("./src/routes/forumRoutes");
const peerSupporterRoutes = require("./src/routes/peerSupporterRoutes");
const resourceRoutes = require("./src/routes/resourceRoutes");
const wellnessActivityRoutes = require("./src/routes/wellnessActivityRoutes");
const goalRoutes = require("./src/routes/goalRoutes");
const sessionRoutes = require("./src/routes/sessionRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to the database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());

// Express 5 leaves req.url empty when the request path equals the mount path
const mount = (path, router) => {
  app.use(path, (req, _res, next) => {
    if (!req.url || req.url === "") req.url = "/";
    next();
  }, router);
};

// Routes


app.get("/api/ping-crisis", (req, res) => {
  res.json({ ok: true, route: "crisis-ping" });
});

app.post("/api/crisis-support", (req, res, next) => {
  req.url = "/";
  return crisisSupportRoutes(req, res, next);
});

app.get("/api/crisis-support", (req, res, next) => {
  req.url = "/";
  return crisisSupportRoutes(req, res, next);
});

app.listen(PORT, () => {
  console.log(`CareCircle API listening on http://localhost:${PORT}`);
});
