// src/stores/user_store.js
import { defineStore } from 'pinia';
import { auth } from '@/firebase.js';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth";
import { User } from '@/scan_api_classes.js'; // Import the User class
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from '@/firebase.js'; // Import your Firestore instance


export const useUserStore = defineStore('user', {
    state: () => ({
        user: null,
        unsubscribe: null, // Store the unsubscribe function
    }),
    actions: {
        async signInWithGoogle() {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider);
                // User will be automatically set by onAuthStateChanged
            } catch (error) {
                console.error("Google Sign-In Error:", error);
                throw error;
            }
        },
        async signOut() {
            try {
                await signOut(auth);
                // User will be automatically set to null by onAuthStateChanged
            } catch (error) {
                console.error("Sign-Out Error:", error);
                throw error;
            }
        },

        initializeAuthListener() {
            if (this.unsubscribe) {
              return
            }
            this.unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
                if (firebaseUser) {
                    // 1. Get/Create User Document in Firestore
                    let userDocSnap
                    try {
                        const userDocRef = doc(db, 'users', firebaseUser.uid);
                        userDocSnap = await getDoc(userDocRef);
                        
                    } catch (error) {
                        console.warn('UserStore: ',  error)
                    }

                    if (!userDocSnap || !userDocSnap.exists()) {
                        // Create a new user document
                        const newUser = new User({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            role: 'user', // Default role
                        });
                        await setDoc(userDocRef, newUser.toFirestoreData());
                        console.log("New user document created:", firebaseUser.uid);
                        userDocSnap = await getDoc(userDocRef); // Fetch it again
                    }

                    // 2. Get Custom Claims
                    const idTokenResult = await firebaseUser.getIdTokenResult();
                    const isAdmin = !!idTokenResult.claims.admin;

                    // 3. Update Pinia Store (with combined data)
                    const userData = userDocSnap.data(); // Get data from Firestore
                    this.user = {
                        id: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL, // Use photoURL from Firebase Auth
                        admin: isAdmin,
                        role: userData.role, // Get role from Firestore (could be 'admin')
                    };
                    console.log("User logged in:", this.user);

                } else {
                    this.user = null;
                    console.log("User logged out");
                }
            });
        },
        stopAuthListener(){
          if (this.unsubscribe){
            this.unsubscribe();
            this.unsubscribe = null;
          }
        }
    },
});