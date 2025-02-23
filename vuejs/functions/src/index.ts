// TEMPORARY CODE - ONLY FOR INITIAL ADMIN SETUP. REMOVE AFTER.
import { getFunctions, httpsCallable } from "firebase/functions";
const functions = getFunctions();
const setAdmin = httpsCallable(functions, 'setAdminClaim');
setAdmin({ email: 'joostkkoch@email.com' }) // Replace with your email
    .then((result) => {
        console.log(result);
    })
    .catch((error) => {
        console.error(error);
    });