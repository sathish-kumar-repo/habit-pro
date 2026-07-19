import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Public web Firebase config (mirrors the Flutter app's firebase_options.dart).
// These values are safe to expose in client code.
const firebaseConfig = {
  apiKey: "AIzaSyDujKsIRbXRMyw-F8nAsN9qtFwa5lFwl14",
  authDomain: "phonk-me.firebaseapp.com",
  projectId: "phonk-me",
  storageBucket: "phonk-me.firebasestorage.app",
  messagingSenderId: "44655979345",
  appId: "1:44655979345:web:3d1008cb479daeec81c170",
  measurementId: "G-39V118G90Z"
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp);
export const auth = getAuth(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
