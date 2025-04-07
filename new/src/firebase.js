// --- START OF FILE firebase.js ---
import {
    initializeApp
} from "firebase/app";
import {
    getFirestore
} from "firebase/firestore";
import {
    getStorage
} from "firebase/storage";
import {
    getAuth,
    onAuthStateChanged
} from "firebase/auth";
import firebaseConfig from './firebaseConfig.json'


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export {
    db,
    storage,
    auth
}; // Only export these

// --- END OF FILE firebase.js ---