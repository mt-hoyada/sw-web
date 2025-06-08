"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const path_1 = __importDefault(require("path"));
let serviceAccount;
if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
}
else {
    serviceAccount = require(path_1.default.join(__dirname, '../serviceAccountKey.json'));
}
firebase_admin_1.default.initializeApp({
    credential: firebase_admin_1.default.credential.cert(serviceAccount)
});
const db = firebase_admin_1.default.firestore();
exports.db = db;
