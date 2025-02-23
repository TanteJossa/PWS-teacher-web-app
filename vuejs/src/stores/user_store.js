// @/stores/user_store.js
import { defineStore } from 'pinia';
import { auth } from '@/firebase.js'; // Import from firebase.js
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from "firebase/auth"; // Import firebase methods


export const useUserStore = defineStore('user', {
    state: () => ({
        user: null, // Start with null
        unsubscribe: null, // Store the unsubscribe function
    }),
    actions: {
        async signInWithGoogle() {
            const provider = new GoogleAuthProvider();
            try {
                await signInWithPopup(auth, provider); // Use Firebase sign-in method
                // User will be automatically set by onAuthStateChanged
            } catch (error) {
                console.error("Google Sign-In Error:", error);
                throw error; // Re-throw for component to handle
            }
        },
        async signOut() {
            try {
                await signOut(auth); // Use Firebase sign-out method
                // User will be automatically set to null by onAuthStateChanged
            } catch (error) {
                console.error("Sign-Out Error:", error);
                throw error; // Re-throw for component to handle
            }
        },
        // This is now the ONLY auth state change handler
        initializeAuthListener() {
          if (this.unsubscribe) {
            // If there is a listener, stop it
            return
          }
          this.unsubscribe = onAuthStateChanged(auth, async (user) => { // Directly use onAuthStateChanged
                if (user) {
                    // Get custom claims (admin role)
                    const idTokenResult = await user.getIdTokenResult();
                    const isAdmin = !!idTokenResult.claims.admin;

                    this.user = {  // Correctly update the store's state
                        id: user.uid,
                        email: user.email,
                        displayName: user.displayName, // Add displayName
                        admin: isAdmin, // Add isAdmin flag
                    };
                    console.log("User logged in:", this.user);
                } else {
                    this.user = null;  // Set to null on logout
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