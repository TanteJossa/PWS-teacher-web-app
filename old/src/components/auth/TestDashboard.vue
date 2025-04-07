<template lang="pug">
div
    v-card(class="mb-4")
        v-card-title My Tests
        v-card-text
            v-btn(color="primary" @click="createTestDialog = true" :disabled="!userStore.user") Create New Test
            v-list(v-if="tests.length > 0")
                v-list-item(v-for="test in tests" :key="test.id")
                    v-list-item-title {{ test.name }}
                    v-list-item-subtitle Created at: {{ new Date(test.created_at).toLocaleDateString() }}
            v-card-text(v-else) No tests created yet.
            v-card-text(v-if="!userStore.user") Please sign in to create and view tests.
    v-alert(v-if="error" type="error" dismissible) {{ error }}

    v-dialog(v-model="createTestDialog" max-width="500px")
        v-card
            v-card-title Create New Test
            v-card-text
                v-text-field(v-model="newTestName" label="Test Name")
            v-card-actions
                v-spacer
                v-btn(color="secondary" @click="createTestDialog = false") Cancel
                v-btn(color="primary" @click="createNewTest" :loading="isCreatingTest") Create

</template>

<script>
// import { supabase } from '@/supabase' // Assuming you set up supabase.js // REMOVE
import { db } from '@/firebase.js';  // NEW - import firestore
import {collection, query, where, orderBy, getDocs, addDoc } from 'firebase/firestore'; //NEW
import { useUserStore } from '@/stores/user_store';


export default {
    // props: { // REMOVE props
    //     user: { // ADDED: Prop to receive user object
    //         type: Object,
    //         default: null
    //     }
    // },
    data() {
        return {
            tests: [],
            error: null,
            createTestDialog: false,
            newTestName: '',
            isCreatingTest: false,
            userStore: useUserStore() //NEW
        }
    },
    // watch: { // REMOVE watch, use onAuthStateChanged instead.
    //     user: { // Watch for user changes and refetch tests
    //         handler: 'fetchUserTests',
    //         immediate: true
    //     }
    // },
    methods: {
        async fetchUserTests() {
            if (!this.userStore.user) { // Only fetch if user is logged in
                this.tests = []; // Clear existing tests if no user
                return;
            }
            this.error = null;
            try {
              const q = query(collection(db, 'tests'), where("user_id", "==", this.userStore.user.id), orderBy("created_at", "desc")); // NEW
              const querySnapshot = await getDocs(q); //NEW

              this.tests = querySnapshot.docs.map(doc => ({ // NEW
                    id: doc.id,
                    ...doc.data()
                }));
            } catch (err) {
                this.error = err.message;
                console.error("Unexpected Fetch Tests Error:", err);
            }
        },
        async createNewTest() {
            if (!this.userStore.user) return; // Prevent creation if no user
            this.isCreatingTest = true;
            this.error = null;
            try {
                const docRef = await addDoc(collection(db, "tests"), { //NEW
                    name: this.newTestName,
                    user_id: this.userStore.user.id
                });

                this.tests.push({  // NEW
                    id: docRef.id,
                    name: this.newTestName,
                    user_id: this.userStore.user.id,
                    created_at: new Date().toISOString() // NEW - Add a created_at timestamp
                });

                this.createTestDialog = false; // NEW
                this.newTestName = ''; // NEW

            } catch (err) {
                this.error = err.message;
                console.error("Unexpected Create Test Error:", err);
            } finally {
                this.isCreatingTest = false;
            }
        }
    },
    async mounted() { // NEW - Fetch tests on mount
        await this.fetchUserTests();
    }
}
</script>