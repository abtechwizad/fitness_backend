const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "../uploads")),
  filename: (req, file, cb) => {
    const ext = (file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i) || [])[1] || "jpg";
    cb(null, `profile-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp)$/i.test(file.originalname) || file.mimetype.startsWith("image/");
    if (allowed) cb(null, true);
    else cb(new Error("Only images (jpg, png, gif, webp) are allowed"));
  },
});

module.exports = { upload };
