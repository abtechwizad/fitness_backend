const express = require("express");
const { getDB } = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

function escapeCsvCell(val) {
  const s = String(val == null ? "" : val);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

router.use(protect);

router.get("/export", async (req, res) => {
  try {
    const format = (req.query.format || "").toLowerCase();
    if (format !== "csv") {
      return res.status(400).json({ message: "Use ?format=csv" });
    }
    
    const db = getDB();
    const snapshot = await db.collection("nutrition").where("user", "==", req.user._id).get();
    let entries = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    const headers = ["Date", "Food", "Meal", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)"];
    const rows = entries.map((e) =>
      [e.date, e.food, e.meal, e.calories, e.protein, e.carbs, e.fat].map(escapeCsvCell).join(",")
    );
    const csv = [headers.join(","), ...rows].join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="nutrition-export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const snapshot = await db.collection("nutrition").where("user", "==", req.user._id).get();
    let entries = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const db = getDB();
    const entryData = { ...req.body, user: req.user._id, createdAt: new Date().toISOString() };
    const docRef = await db.collection("nutrition").add(entryData);
    res.status(201).json({ _id: docRef.id, ...entryData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const db = getDB();
    const docRef = db.collection("nutrition").doc(req.params.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().user !== req.user._id) {
       return res.status(404).json({ message: "Entry not found" });
    }
    
    await docRef.set(req.body, { merge: true });
    const updatedSnap = await docRef.get();
    res.json({ _id: updatedSnap.id, ...updatedSnap.data() });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = getDB();
    const docRef = db.collection("nutrition").doc(req.params.id);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists || docSnap.data().user !== req.user._id) {
       return res.status(404).json({ message: "Entry not found" });
    }
    
    await docRef.delete();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
