require('dotenv').config();
const { connectDB, admin } = require('./config/db');
const { Firestore } = require('@google-cloud/firestore');

async function run() {
  await connectDB();
  
  try {
    // Attempt with databaseId: 'default'
    const db = new Firestore({
      projectId: 'fitness-77cc8',
      databaseId: 'default',
      credentials: require('./firebase-key.json')
    });
    
    const snap = await db.collection('users').get();
    console.log("Success with 'default':", snap.docs.length);
  } catch(err) {
    console.log("ERROR FULL CODE ('default'):", err.code);
    console.log("ERROR FULL MESSAGE ('default'):", err.message);
  }

  try {
    // Attempt with admin.firestore()
    const dbAdmin = admin.firestore();
    const snapAdmin = await dbAdmin.collection('users').get();
    console.log("Success with Admin SDK:", snapAdmin.docs.length);
  } catch(err) {
    console.log("ERROR FULL CODE (Admin):", err.code);
    console.log("ERROR FULL MESSAGE (Admin):", err.message);
  }
}
run();
