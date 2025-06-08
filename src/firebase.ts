import admin from 'firebase-admin';
import path from 'path';

let serviceAccount;
if (process.env.GOOGLE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require(path.join(__dirname, '../serviceAccountKey.json'));
}

// 이미 초기화된 경우 중복 초기화 방지
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

export { db, admin }; 