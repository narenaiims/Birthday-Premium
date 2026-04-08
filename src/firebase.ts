import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';
import { getStorage } from 'firebase/storage';

// Default configuration for development
const defaultFirebaseConfig = {
  apiKey: "AIzaSyA-PLACEHOLDER",
  authDomain: "birthday-premium.firebaseapp.com",
  projectId: "birthday-premium",
  storageBucket: "birthday-premium.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Try to load the config file
// @ts-ignore
const configs = import.meta.glob('../firebase-applet-config.json', { eager: true });
const firebaseConfig = (configs['../firebase-applet-config.json'] as any)?.default || defaultFirebaseConfig;

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
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
