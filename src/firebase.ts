import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

// Firebase configuration prioritizing environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID,
};

// Fallback to local config file if environment variables are missing (for local development)
const loadConfig = () => {
  if (!firebaseConfig.apiKey) {
    try {
      // @ts-ignore
      const configs = import.meta.glob('../firebase-applet-config.json', { eager: true });
      const localConfig = (configs['../firebase-applet-config.json'] as any)?.default;
      if (localConfig) {
        Object.assign(firebaseConfig, localConfig);
      }
    } catch (e) {
      console.warn("Could not load local firebase-applet-config.json");
    }
  }
};

loadConfig();

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);
export const getMessagingSafe = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getMessaging(app);
  }
  return null;
};
export const googleProvider = new GoogleAuthProvider();

// Connection test
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase Connection Error: The client is offline. This usually means the Firebase configuration is missing or incorrect. Please ensure the 'firebase-applet-config.json' file is present and contains valid credentials.");
    } else {
      console.error("Firebase Connection Error:", error);
    }
  }
}
testConnection();
