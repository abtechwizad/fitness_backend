const dotenv = require("dotenv");
const { connectDB } = require("./config/db");
const logger = require("./utils/logger");
const app = require("./app");

dotenv.config();

connectDB();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
