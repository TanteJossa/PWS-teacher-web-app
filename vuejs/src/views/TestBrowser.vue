<template lang="pug">
v-container
    v-text-field(
        v-model="testManager.searchQuery"
        label="Search Tests"
        append-icon="mdi-magnify"
        @input="testManager.fetchTests"
    )
    v-tabs(v-model="activeTab" background-color="primary" dark)
        v-tab(value="mytests") My Tests
        v-tab(value="public") Public Tests
        v-tab(value="admin" v-if="userStore.user && userStore.user.admin") Admin
    v-tabs-window(v-model="activeTab")
        v-tabs-window-item(value="mytests")
            v-card
                v-card-title My Tests
                v-card-text
                    v-progress-circular(v-if="testManager.loading" indeterminate)
                    v-list(v-else)
                        v-list-item(v-for="test in testManager.filteredTests" :key="test.id" @click="openTest(test)" :title="test.name")
                            v-list-item-subtitle Created at: {{ new Date(test.created_at).toLocaleDateString() }}
                            v-list-item-action
                    v-btn(
                        prepend-icon="mdi-plus"
                        @click="this.$router.push({ name: 'new_test' })"
                    ) Nieuwe toets
        v-tabs-window-item(value="public")
            v-card
                v-card-title Public Tests
                v-card-text
                    v-progress-circular(v-if="testManager.loading" indeterminate)
                    v-list(v-else)
                        v-list-item(v-for="test in publicTests" :key="test.id" @click="openTest(test)" :title="test.name")
                            v-list-item-subtitle Created at: {{ new Date(test.created_at).toLocaleDateString() }}
        v-tabs-window-item(value="admin" v-if="userStore.user && userStore.user.admin")
            v-card
                v-card-title Admin: All Tests
                v-card-text
                    v-text-field(
                        v-model="adminSearchQuery"
                        label="Search by Username"
                        append-icon="mdi-magnify"
                        @input="performAdminSearch"
                    )
                    v-progress-circular(v-if="testManager.loading" indeterminate)
                    v-list(v-else)
                        v-list-item(v-for="test in filteredAdminTests" :key="test.id" @click="openTest(test)")
                            v-list-item-title {{ test.name }} - {{ test.user_id }}
                            v-list-item-action
</template>

<script>
import {
    TestManager
} from '@/scan_api_classes'; // Import TestManager

import {
    useUserStore
} from '@/stores/user_store'; // Import UserStore
import { db } from '@/firebase.js';
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";


export default {
    name: 'TestsBrowser',
    data() {
        return {
            testManager: new TestManager(),
            // userStore: useUserStore(), // REMOVED, added to setup()
            activeTab: 'mytests',
            adminSearchQuery: '',

        }
    },
    setup() { // Using setup() for Composition API
        const userStore = useUserStore();
        return { userStore }
    },
    computed: {
        publicTests() {
            return this.testManager.tests.filter(test => test.is_public);
        },
        filteredAdminTests() {
            if (!this.userStore.user || !this.userStore.user.admin) {
                return [];
            }
            if (!this.adminSearchQuery) {
                return this.testManager.tests;
            }

            return this.testManager.tests.filter(test =>
                test.user_id.toLowerCase().includes(this.adminSearchQuery.toLowerCase()) // Using user_id
            );
        }
    },
    methods: {
        performAdminSearch() {
            // This is handled by the computed property now.
        },
        openTest(test) {
            this.$router.push({
                name: 'test',
                params: {
                    id: test.id
                }
            }); // Navigate to TestView with test ID
        },

        async fetchTests() { // Changed method name to prevent conflict with TestManager
            this.testManager.loading = true;

            if (!this.userStore.user) {
                console.error("No user logged in.");
                this.testManager.loading = false;
                return;
            }
            try {
                let q;
                if (this.userStore.user.admin) {
                    q = query(collection(db, "tests"), orderBy("created_at", "desc"));
                }
                else {
                    q = query(collection(db, "tests"), where("user_id", "==", this.userStore.user.id), orderBy("created_at", "desc"));
                }
                const querySnapshot = await getDocs(q);
                this.testManager.tests = querySnapshot.docs.map(doc => this.testManager.loadTestFromData({
                    id: doc.id,
                    ...doc.data()
                }));

            }
            catch (e){
                console.log(e)
            }

            this.testManager.loading = false;
        }

    },
    watch: {
        // async 'userStore.user'(newUser){ // Watch for user changes //REMOVING WATCH
        //     if (newUser) {
        //         await this.fetchTests(); // Refetch when user changes.
        //     }
        // }
    },
    async mounted() {
        await this.fetchTests(); // Load initial tests
    },
};
</script>

<style scoped>
.tests-browser {
    padding: 16px;
}
</style>