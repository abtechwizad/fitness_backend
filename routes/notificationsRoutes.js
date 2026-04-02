const express = require("express");
const { getDB } = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const snapshot = await db.collection("notifications").where("user", "==", req.user._id).get();
    let list = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    
    list.sort((a, b) => {
      if (a.dueTime && b.dueTime) {
        return new Date(a.dueTime) - new Date(b.dueTime);
      } else if (a.dueTime) return -1;
      else if (b.dueTime) return 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { type, title, message, dueTime } = req.body || {};
    const db = getDB();
    
    const notifData = {
      user: req.user._id,
      type: ["reminder", "workout", "meal", "goal", "alert"].includes(type) ? type : "reminder",
      title: title || "",
      message: message || "Reminder",
      dueTime: dueTime ? new Date(dueTime).toISOString() : null,
      createdAt: new Date().toISOString(),
      read: false
    };
    
    const docRef = await db.collection("notifications").add(notifData);
    res.status(201).json({ _id: docRef.id, ...notifData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const db = getDB();
    const docRef = db.collection("notifications").doc(req.params.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().user !== req.user._id) {
       return res.status(404).json({ message: "Not found" });
    }
    
    const { type, title, message, dueTime } = req.body || {};
    const updates = {};
    if (type != null && ["reminder", "workout", "meal", "goal", "alert"].includes(type)) updates.type = type;
    if (title != null) updates.title = title;
    if (message != null) updates.message = message;
    if (dueTime !== undefined) updates.dueTime = dueTime ? new Date(dueTime).toISOString() : null;
    
    await docRef.set(updates, { merge: true });
    const updated = await docRef.get();
    
    res.json({ _id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:id/read", async (req, res) => {
  try {
    const db = getDB();
    const docRef = db.collection("notifications").doc(req.params.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().user !== req.user._id) {
       return res.status(404).json({ message: "Not found" });
    }
    
    await docRef.update({ read: true });
    const updated = await docRef.get();
    
    res.json({ _id: updated.id, ...updated.data() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = getDB();
    const docRef = db.collection("notifications").doc(req.params.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().user !== req.user._id) {
       return res.status(404).json({ message: "Not found" });
    }
    
    await docRef.delete();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
