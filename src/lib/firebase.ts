import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDOm35g_5MHQbV1bopNlH1ooMrIawBpRUY",
  authDomain: "pushkaralu-crowd-monitor.firebaseapp.com",
  databaseURL: "https://pushkaralu-crowd-monitor-default-rtdb.firebaseio.com",
  projectId: "pushkaralu-crowd-monitor",
  storageBucket: "pushkaralu-crowd-monitor.firebasestorage.app",
  messagingSenderId: "154756713561",
  appId: "1:154756713561:web:1232ffec7658577d96b548",
  measurementId: "G-7YH5QSNNV2"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const firestoreDB = getFirestore(app);
