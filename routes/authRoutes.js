const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { getDB } = require("../config/db");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

function toPublicUser(user) {
  const { password, ...rest } = user;
  return rest;
}

router.post("/register", upload.single("profilePicture"), async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const db = getDB();
    const existingObj = await db.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
    if (!existingObj.empty)
      return res.status(400).json({ message: "Email already registered" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const profilePicture = req.file ? "/uploads/" + req.file.filename : "";
    
    const newUser = {
      name: name.trim(),
      email: email.toLowerCase(),
      password: hashedPassword,
      profilePicture,
      location: "",
      bio: "",
      theme: "light",
      accentColor: "green",
      goals: { calorieTarget: 2000, waterGoalL: 3, workoutsPerWeek: 4 },
      units: "metric",
      notificationPreferences: { push: true, workoutReminders: true, mealReminders: false },
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection("users").add(newUser);
    
    res.status(201).json({
      _id: docRef.id,
      name: newUser.name,
      email: newUser.email,
      profilePicture: newUser.profilePicture,
      token: generateToken(docRef.id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDB();
    const snapshot = await db.collection("users").where("email", "==", email.toLowerCase()).limit(1).get();
    if (snapshot.empty)
      return res.status(401).json({ message: "Invalid email or password" });

    const userDoc = snapshot.docs[0];
    const user = userDoc.data();
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    res.json({
      _id: userDoc.id,
      name: user.name,
      email: user.email,
      profilePicture: user.profilePicture || "",
      theme: user.theme || "light",
      accentColor: (user.accentColor && ["green", "blue", "purple", "orange", "teal"].includes(user.accentColor)) ? user.accentColor : "green",
      token: generateToken(userDoc.id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/me", protect, async (req, res) => {
  res.json(req.user);
});

router.put("/profile", protect, upload.single("profilePicture"), async (req, res) => {
  try {
    const body = req.body || {};
    const { name, location, bio, theme } = body;
    const updates = {};
    if (name != null && name !== "") updates.name = name;
    if (location != null) updates.location = location;
    if (bio != null) updates.bio = bio;
    if (theme != null && ["light", "dark", "system"].includes(theme)) updates.theme = theme;
    if (body.accentColor != null && body.accentColor !== "") updates.accentColor = body.accentColor;
    if (req.file) updates.profilePicture = "/uploads/" + req.file.filename;

    const g = body.goals || {};
    const calorieTarget = body.goalsCalorieTarget != null && body.goalsCalorieTarget !== "" ? parseInt(body.goalsCalorieTarget, 10) : g.calorieTarget;
    const waterGoalL = body.goalsWaterGoalL != null && body.goalsWaterGoalL !== "" ? parseFloat(body.goalsWaterGoalL) : g.waterGoalL;
    const workoutsPerWeek = body.goalsWorkoutsPerWeek != null && body.goalsWorkoutsPerWeek !== "" ? parseInt(body.goalsWorkoutsPerWeek, 10) : g.workoutsPerWeek;
    if (calorieTarget != null && !Number.isNaN(calorieTarget)) updates["goals.calorieTarget"] = Math.max(0, calorieTarget);
    if (waterGoalL != null && !Number.isNaN(waterGoalL)) updates["goals.waterGoalL"] = Math.max(0, waterGoalL);
    if (workoutsPerWeek != null && !Number.isNaN(workoutsPerWeek)) updates["goals.workoutsPerWeek"] = Math.max(0, Math.min(7, workoutsPerWeek));
    
    if (body.units != null && ["metric", "imperial"].includes(body.units)) updates.units = body.units;
    
    const prefs = body.notificationPreferences;
    if (prefs && typeof prefs === "object") {
      if (typeof prefs.push === "boolean") updates["notificationPreferences.push"] = prefs.push;
      if (typeof prefs.workoutReminders === "boolean") updates["notificationPreferences.workoutReminders"] = prefs.workoutReminders;
      if (typeof prefs.mealReminders === "boolean") updates["notificationPreferences.mealReminders"] = prefs.mealReminders;
    }
    if (body.notificationPush !== undefined) updates["notificationPreferences.push"] = body.notificationPush === true || body.notificationPush === "true";
    if (body.notificationWorkoutReminders !== undefined) updates["notificationPreferences.workoutReminders"] = body.notificationWorkoutReminders === true || body.notificationWorkoutReminders === "true";
    if (body.notificationMealReminders !== undefined) updates["notificationPreferences.mealReminders"] = body.notificationMealReminders === true || body.notificationMealReminders === "true";

    const db = getDB();
    const userRef = db.collection("users").doc(req.user._id);
    
    await userRef.set(updates, { merge: true });
    const userSnap = await userRef.get();
    
    res.json({ _id: userSnap.id, ...toPublicUser(userSnap.data()) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/password", protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6)
      return res.status(400).json({ message: "Current password and new password (min 6 chars) required" });

    const db = getDB();
    const userRef = db.collection("users").doc(req.user._id);
    const userSnap = await userRef.get();
    const userData = userSnap.data();

    const isMatch = await bcrypt.compare(currentPassword, userData.password);
    if (!isMatch)
      return res.status(401).json({ message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userRef.update({ password: hashedPassword });
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get("/export", protect, async (req, res) => {
  try {
    const db = getDB();
    const userId = req.user._id;

    const [workoutsSnap, nutritionSnap, progressSnap, userSnap] = await Promise.all([
      db.collection("workouts").where("user", "==", userId).get(),
      db.collection("nutrition").where("user", "==", userId).get(),
      db.collection("progress").where("user", "==", userId).get(),
      db.collection("users").doc(userId).get()
    ]);

    const workouts = workoutsSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const nutrition = nutritionSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const progress = progressSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    const user = { _id: userSnap.id, ...toPublicUser(userSnap.data()) };

    res.json({ exportedAt: new Date().toISOString(), user, workouts, nutrition, progress });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
