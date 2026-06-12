import AsyncStorage from "@react-native-async-storage/async-storage";
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from "@firebase/auth";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getFirestore,
  type Firestore,
  initializeFirestore,
  enableIndexedDbPersistence
} from "@firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } catch {
    authInstance = getAuth(app);
  }

  try {
    dbInstance = initializeFirestore(app, {
      experimentalForceLongPolling: true
    });
    // Enable offline persistence on web
    enableIndexedDbPersistence(dbInstance).catch((err) => {
      if (err.code === "failed-precondition") {
        console.log("Firestore: Multiple tabs open, persistence only enabled in one tab.");
      } else if (err.code === "unimplemented") {
        console.log("Firestore: Browser doesn't support persistence.");
      }
    });
  } catch {
    dbInstance = getFirestore(app);
  }
}

export const firebaseApp = app;
export const auth = authInstance;
export const db = dbInstance;
