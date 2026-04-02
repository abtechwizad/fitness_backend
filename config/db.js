const admin = require("firebase-admin");

const connectDB = async () => {
  try {
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
        const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, 'base64').toString('utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
        const path = require("path");
        const fs = require("fs");
        const keyPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH.replace(/['"]/g, ''));
        
        if (fs.existsSync(keyPath)) {
            const serviceAccount = require(keyPath);
            admin.initializeApp({
              credential: admin.credential.cert(serviceAccount)
            });
        } else {
            console.warn(`Warning: service account file not found at ${keyPath}, falling back to default credentials`);
            admin.initializeApp();
        }
      } else {
        admin.initializeApp();
      }
    }
    console.log("Firebase Admin Initialized successfully.");
    
  } catch (error) {
    console.error(`Firebase Connection Error: ${error.message}`);
    process.exit(1);
  }
};

let firestoreInstance = null;

const getDB = () => {
  if (!firestoreInstance) {
    firestoreInstance = admin.firestore();
  }
  return firestoreInstance;
};

module.exports = { connectDB, getDB, admin };
