import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCYzwOAgDojw0BRykK_xE55PZqx5B1wYy0",
  authDomain: "the-runway-2026.firebaseapp.com",
  projectId: "the-runway-2026",
  storageBucket: "the-runway-2026.firebasestorage.app",
  messagingSenderId: "773829933066",
  appId: "1:773829933066:web:92a1208fc158814bf647f3",
  measurementId: "G-N52TZK002T"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

// Export local instances
export { db, auth, analytics };

// Proxy exports for Firestore
export {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    setDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    increment,
    runTransaction
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Proxy exports for Auth
export {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    setPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
