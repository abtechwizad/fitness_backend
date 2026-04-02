const path = require("path");
const dotenv = require("dotenv");
const connectDB = require("../config/db");
const Feedback = require("../models/Feedback");

dotenv.config({ path: path.join(__dirname, "..", ".env") });

(async () => {
  try {
    await connectDB();
    const result = await Feedback.updateMany(
      { adminReply: { $exists: false } },
      { $set: { adminReply: null, adminRepliedAt: null } }
    );
    const modified = result.modifiedCount ?? result.nModified ?? 0;
    console.log(`Backfilled adminReply fields on ${modified} feedback documents.`);
  } catch (err) {
    console.error("Error backfilling feedback fields:", err);
  } finally {
    process.exit(0);
  }
})();

