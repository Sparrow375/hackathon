import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAmvXYvotYlclGrwJG7WGM8LnhYmYShzxo",
    authDomain: "pitch-it-up-57491.firebaseapp.com",
    projectId: "pitch-it-up-57491",
    storageBucket: "pitch-it-up-57491.firebasestorage.app",
    messagingSenderId: "436958581083",
    appId: "1:436958581083:web:c87de009e230f79ef5ca7e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Export local instances
export { db, auth };

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
    increment
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Proxy exports for Auth
export {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";


