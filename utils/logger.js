const { createLogger, format, transports } = require("winston");
const path = require("path");

const logDir = path.join(__dirname, "..", "logs");

const logger = createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ level, message, timestamp, stack }) => {
      return stack
        ? `${timestamp} [${level}]: ${message} - ${stack}`
        : `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({ level, message, timestamp }) => `${timestamp} [${level}]: ${message}`)
      ),
    }),
    new transports.File({ filename: path.join(logDir, "error.log"), level: "error" }),
    new transports.File({ filename: path.join(logDir, "app.log") }),
  ],
});

logger.stream = {
  write(message) {
    logger.http(message.trim());
  },
};

module.exports = logger;

