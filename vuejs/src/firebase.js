// --- START OF FILE firebase.js ---
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref } from 'vue'; // NO LONGER NEEDED HERE. Pinia handles reactivity

const firebaseConfig = {
  apiKey: "AIzaSyAz5WwzYx5dkI8VlBH0qoXTduNisCdmfaw",
  authDomain: "toetspws.firebaseapp.com",
  projectId: "toetspws",
  storageBucket: "toetspws.firebasestorage.app",
  messagingSenderId: "771520566941",
  appId: "1:771520566941:web:76dd9b37e4cb84e6f6a674",
  measurementId: "G-4W9YL1FRW7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);
const currentUser = ref(auth.currentUser)


onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser.value = user
    }
})

export { db, storage, auth, currentUser }; // Only export these

// --- END OF FILE firebase.js ---