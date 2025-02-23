"use strict";
exports.__esModule = true;
// TEMPORARY CODE - ONLY FOR INITIAL ADMIN SETUP. REMOVE AFTER.
var functions_1 = require("firebase/functions");
var functions = (0, functions_1.getFunctions)();
var setAdmin = (0, functions_1.httpsCallable)(functions, 'setAdminClaim');
setAdmin({ email: 'joostkkoch@email.com' }) // Replace with your email
    .then(function (result) {
    console.log(result);
})["catch"](function (error) {
    console.error(error);
});
