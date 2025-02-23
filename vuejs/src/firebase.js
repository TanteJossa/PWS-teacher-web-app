// --- START OF FILE firebase.js ---
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ref } from 'vue'; // NO LONGER NEEDED HERE. Pinia handles reactivity
import firebaseConfig from './firebaseConfig.json'


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