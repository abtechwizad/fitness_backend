const express = require("express");
const { getDB } = require("../config/db");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router.get("/", async (req, res) => {
  try {
    const db = getDB();
    const snapshot = await db.collection("progress").where("user", "==", req.user._id).get();
    let entries = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      date, weight, bench, squat, deadlift, runTimeMinutes,
      waist, chest, hips, biceps, activeMinutes, waterLiters,
    } = req.body;
    
    const db = getDB();
    const snapshot = await db.collection("progress")
      .where("user", "==", req.user._id)
      .where("date", "==", date)
      .limit(1).get();

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0].ref;
      const updates = {};
      if (weight != null) updates.weight = weight;
      if (bench != null) updates.bench = bench;
      if (squat != null) updates.squat = squat;
      if (deadlift != null) updates.deadlift = deadlift;
      if (runTimeMinutes != null) updates.runTimeMinutes = runTimeMinutes;
      if (waist != null) updates.waist = waist;
      if (chest != null) updates.chest = chest;
      if (hips != null) updates.hips = hips;
      if (biceps != null) updates.biceps = biceps;
      if (activeMinutes != null) updates.activeMinutes = activeMinutes;
      if (waterLiters != null) updates.waterLiters = waterLiters;
      
      await docRef.set(updates, { merge: true });
      const updated = await docRef.get();
      res.status(201).json({ _id: updated.id, ...updated.data() });
    } else {
      const entryData = {
        user: req.user._id,
        date,
        weight, bench, squat, deadlift, runTimeMinutes,
        waist, chest, hips, biceps, activeMinutes, waterLiters,
        createdAt: new Date().toISOString()
      };
      const docRef = await db.collection("progress").add(entryData);
      res.status(201).json({ _id: docRef.id, ...entryData });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const db = getDB();
    const docRef = db.collection("progress").doc(req.params.id);
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
