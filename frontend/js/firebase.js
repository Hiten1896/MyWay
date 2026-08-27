import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    addDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    getDocs,
    setLogLevel 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Set Firestore log level to Debug
setLogLevel('Debug');

// Environment config fallback
const envConfig = window.ENV || {};
const appId = typeof __app_id !== 'undefined' ? __app_id : (envConfig.APP_ID || 'default-app-id');

let firebaseConfig = {};
try {
    if (typeof __firebase_config !== 'undefined') {
        firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
    } else if (envConfig.FIREBASE_CONFIG && Object.keys(envConfig.FIREBASE_CONFIG).length > 0) {
        firebaseConfig = envConfig.FIREBASE_CONFIG;
    }
} catch (e) {
    console.error("Error parsing firebaseConfig:", e);
}

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let db = null;
let auth = null;
let userId = null;
let isAuthReady = false;

// Function to initialize Firebase and authenticate
async function initializeFirebase() {
    try {
        if (!firebaseConfig || Object.keys(firebaseConfig).length === 0) {
            console.warn("Firebase config not provided. Watchlist state will use in-memory storage.");
            userId = crypto.randomUUID();
            isAuthReady = true;
            if (typeof window.initAppWatchlist === 'function') {
                window.initAppWatchlist();
            }
            return;
        }
        
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Authenticate the user
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // Listen for auth state change to get the user ID
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("Firebase Auth Ready. User ID:", userId);
            } else {
                userId = crypto.randomUUID();
                console.log("Signed in anonymously. Anon ID:", userId);
            }
            isAuthReady = true;
            if (typeof window.initAppWatchlist === 'function') {
                window.initAppWatchlist(); 
            }
        });

    } catch (error) {
        console.error("Error initializing Firebase:", error);
        userId = crypto.randomUUID();
        isAuthReady = true;
        if (typeof window.initAppWatchlist === 'function') {
            window.initAppWatchlist();
        }
    }
}

// Expose Firebase instance and Firestore methods globally for the main script
window.getFirebase = () => ({ 
    db, 
    auth, 
    userId, 
    isAuthReady, 
    appId,
    doc, 
    getDoc, 
    addDoc, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    onSnapshot, 
    collection, 
    query, 
    where, 
    getDocs 
});

// Export firestore helpers for modular usage
export { db, auth, doc, setDoc, deleteDoc, collection, getDocs, onSnapshot };

initializeFirebase();






