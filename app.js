const express = require("express");
const path = require("path");
const cors = require("cors");
const morgan = require("morgan");
const fs = require("fs");
const dotenv = require("dotenv");
const logger = require("./utils/logger");

// Load environment variables (MONGO_URI, JWT_SECRET, etc.) for both app and tests
dotenv.config();

const app = express();

// Ensure logs directory exists
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// HTTP request logging
app.use(morgan("combined", { stream: logger.stream }));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/users", require("./routes/usersRoutes"));
app.use("/api/workouts", require("./routes/workoutRoutes"));
app.use("/api/nutrition", require("./routes/nutritionRoutes"));
app.use("/api/progress", require("./routes/progressRoutes"));
app.use("/api/notifications", require("./routes/notificationsRoutes"));
app.use("/api/feedback", require("./routes/feedbackRoutes"));

app.get("/", (req, res) => {
  res.json({ message: "Fitness Tracker API is running!" });
});

// Global error handler
// Note: most routes already handle errors, but this catches any thrown/next(err)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl}: ${err.message}`, { stack: err.stack });
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

module.exports = app;

