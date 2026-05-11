import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { initializeFirestore, doc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "@/firebase-applet-config.json";

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Improved Firestore initialization with settings for better connectivity
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);

// Test connection as per guidelines
async function testConnection() {
  try {
    // Attempting to get the health check doc
    await getDocFromServer(doc(db, "test", "connection"));
    console.log("Firebase connected successfully (Health Check Passed).");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes("permission-denied")) {
        console.warn("Firebase connected, but Health Check doc access was denied by rules.");
      } else if (error.message.includes("client is offline") || error.message.includes("Could not reach Cloud Firestore backend")) {
        console.error("Firebase is offline. Check configuration or project status.");
      } else {
        console.error("Firebase connection test failed:", error.message);
      }
    } else {
      console.error("Firebase connection test failed with unknown error:", error);
    }
  }
}
testConnection();
