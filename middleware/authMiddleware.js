const jwt = require("jsonwebtoken");
const { getDB } = require("../config/db");

const protect = async (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const db = getDB();
    const userDocRef = db.collection("users").doc(decoded.id);
    const userSnap = await userDocRef.get();
    
    if (!userSnap.exists) {
      return res.status(401).json({ message: "User no longer exists" });
    }
    
    const { password, ...userData } = userSnap.data();
    req.user = { _id: userSnap.id, ...userData };
    next();
  } catch (error) {
    res.status(401).json({ message: "Token invalid" });
  }
};

module.exports = { protect };
