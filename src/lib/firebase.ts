import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  User
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  deleteDoc, 
  updateDoc 
} from "firebase/firestore";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  update, 
  remove,
  child,
  onValue,
  off,
  Database
} from "firebase/database";
import rawConfig from "../../firebase-applet-config.json";

export interface FirebaseAppConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  databaseURL?: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  measurementId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

export const firebaseConfig: FirebaseAppConfig = rawConfig;

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Ensure local persistence for seamless page reloads
if (typeof window !== "undefined") {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Could not set Firebase auth persistence:", err);
  });
}

// Google Auth Provider configured for clean popup/redirect flow
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Initialize Firebase Realtime Database
const defaultRtdbUrl = firebaseConfig.databaseURL || `https://${firebaseConfig.projectId}-default-rtdb.firebaseio.com`;
export let rtdb: Database | null = null;
try {
  rtdb = getDatabase(app, defaultRtdbUrl);
} catch (rtdbErr) {
  console.warn("Realtime Database initialized with default instance:", rtdbErr);
  try {
    rtdb = getDatabase(app);
  } catch (e) {
    console.error("Firebase Realtime Database initialization error:", e);
  }
}

// Initialize Cloud Firestore (as supplemental/backup data store)
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || "(default)");

export {
  app,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  ref,
  set,
  get,
  update,
  remove,
  child,
  onValue,
  off,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
  updateDoc
};

export type { User };
