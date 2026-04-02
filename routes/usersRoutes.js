const express = require("express");
const { getDB } = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", protect, async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const db = getDB();
    // To support regex 'like' queries, we fetch all users or use a startAt/endAt if possible.
    // Given without a specific index it might be slow, for mock we just fetch all users and filter
    const snapshot = await db.collection("users").get();
    
    const users = snapshot.docs
      .map(doc => ({ _id: doc.id, name: doc.data().name, profilePicture: doc.data().profilePicture }))
      .filter(u => u._id !== req.user._id && u.name.toLowerCase().includes(q))
      .slice(0, 20);
      
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id || id.length < 5) {
      return res.status(400).json({ message: "Invalid user id" });
    }
    
    const db = getDB();
    const docSnap = await db.collection("users").doc(id).get();
    
    if (!docSnap.exists) return res.status(404).json({ message: "User not found" });
    
    const user = { _id: docSnap.id, name: docSnap.data().name, profilePicture: docSnap.data().profilePicture, bio: docSnap.data().bio };
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
