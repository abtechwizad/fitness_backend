const admin = require("firebase-admin");

const connectDB = async () => {
  try {
    // If no credentials are provided via GOOGLE_APPLICATION_CREDENTIALS,
    // this will attempt to use default credentials. For local dev without creds,
    // we can fallback to mock or simply warn the user.
    if (!admin.apps.length) {
      if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
        const path = require("path");
        const keyPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH.replace(/['"]/g, ''));
        const serviceAccount = require(keyPath);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      } else {
        // Assume default credentials or FIREBASE_CONFIG environment variables are set
        admin.initializeApp();
      }
    }
    console.log("Firebase Admin Initialized successfully.");
    
    // We will export db below
  } catch (error) {
    console.error(`Firebase Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const { Firestore } = require('@google-cloud/firestore');

let firestoreInstance = null;

const getDB = () => {
  if (!firestoreInstance) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH) {
      const path = require("path");
      const keyPath = path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH.replace(/['"]/g, ''));
      firestoreInstance = new Firestore({
        projectId: require(keyPath).project_id,
        databaseId: 'default',
        keyFilename: keyPath
      });
    } else {
      // Fallback if no credentials given
      firestoreInstance = admin.firestore();
    }
  }
  return firestoreInstance;
};

module.exports = { connectDB, getDB, admin };
