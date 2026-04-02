const express = require("express");
const { getDB } = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const snapshot = await db.collection("feedback").where("user", "==", req.user._id).get();
    let list = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, subject, message, email } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }
    
    const db = getDB();
    const feedbackData = {
      user: req.user?._id,
      email: (email && email.trim()) || req.user?.email || "",
      type: ["bug", "idea", "support", "other"].includes(type) ? type : "support",
      subject: subject || "",
      message: message.trim(),
      createdAt: new Date().toISOString()
    };
    
    const docRef = await db.collection("feedback").add(feedbackData);
    res.status(201).json({ _id: docRef.id, ...feedbackData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/reply", async (req, res) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "";
    if (!adminEmail || req.user.email !== adminEmail) {
      return res.status(403).json({ message: "Only admin can reply" });
    }
    const { adminReply } = req.body || {};
    if (typeof adminReply !== "string" || !adminReply.trim()) {
      return res.status(400).json({ message: "adminReply is required" });
    }
    
    const db = getDB();
    const docRef = db.collection("feedback").doc(req.params.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return res.status(404).json({ message: "Not found" });
    }
    
    await docRef.update({ adminReply: adminReply.trim(), adminRepliedAt: new Date().toISOString() });
    const updated = await docRef.get();
    
    res.json({ _id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
