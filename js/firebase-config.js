import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, getDocs, deleteDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDZlBZdqqet5e9Y-WCnAZ76daCQPVYMGRc",
    authDomain: "story-writing-competition.firebaseapp.com",
    projectId: "story-writing-competition",
    storageBucket: "story-writing-competition.firebasestorage.app",
    messagingSenderId: "494031666393",
    appId: "1:494031666393:web:27b2f4a51f1f7271c792c8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

export { db, auth, doc, setDoc, getDoc, onSnapshot, collection, getDocs, deleteDoc, arrayUnion, signInWithEmailAndPassword, signOut };
