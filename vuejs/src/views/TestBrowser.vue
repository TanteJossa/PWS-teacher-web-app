<template lang="pug">
v-container
    v-text-field(
        v-model="testManager.searchQuery"
        label="Search Tests"
        append-icon="mdi-magnify"
        @input="testManager.fetchTests"
    )
    v-tabs(v-model="active_tab" background-color="primary" dark)
        v-tab(value="mytests") My Tests
        v-tab(value="public") Public Tests
        v-tab(value="admin" v-if="user_store.isAdmin") Admin
    v-tabs-window(v-model="active_tab")
        v-tabs-window-item(value="mytests")
            v-card
                v-card-title My Tests
                v-card-text
                    v-progress-circular(v-if="testManager.loading" indeterminate)
                    v-list(v-else)
                        v-list-item(v-for="test in testManager.filteredTests" :key="test.id" @click="openTest(test)")
                            v-list-item-title {{ test.name }}
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
                        v-list-item(v-for="test in publicTests" :key="test.id" @click="openTest(test)")
                            v-list-item-title {{ test.name }}
                            v-list-item-subtitle Created at: {{ new Date(test.created_at).toLocaleDateString() }}
        v-tabs-window-item(value="admin" v-if="user_store.isAdmin")
            v-card
                v-card-title Admin: All Tests
                v-card-text
                    v-text-field(
                        v-model="admin_search_query"
                        label="Search by Username"
                        append-icon="mdi-magnify"
                        @input="performAdminSearch"
                    )
                    v-progress-circular(v-if="testManager.loading" indeterminate)
                    v-list(v-else)
                        v-list-item(v-for="test in filteredAdminTests" :key="test.id" @click="openTest(test)")
                            v-list-item-title {{ test.name }} - {{ test.user_id }}
                                //- Using user_id for now, in order to use user.username all the users need to be loaded
                            v-list-item-action
</template>

<script>
import {
    TestManager
} from '@/scan_api_classes'; // Import TestManager

import {
    useUserStore
} from '@/stores/user_store';



export default {
    name: 'TestsBrowser',
    data() {
        return {
            testManager: new TestManager(),
            active_tab: 'mytests',
            admin_search_query: '',
        }
    },
    setup() {
        const user_store = useUserStore();

        return {
            user_store
        }
        
    },
    computed: {
        publicTests (){
            return this.testManager.tests.filter(test => test.is_public);
        },
        filteredAdminTests (){
            if (!this.user_store.isAdmin) {
                return [];
            }
            if (!this.admin_search_query) {
                return this.testManager.tests;
            }
            // You'll need to fetch the user's username for this to work.
            // For simplicity, I'm assuming a 'username' field exists. Adapt as needed.
            return this.testManager.tests.filter(test =>
                test.user_id.toLowerCase().includes(this.admin_search_query.toLowerCase()) // Placeholder for user search
            );
        }

    },
    methods: {
        performAdminSearch() {
            // This is handled by the computed property now.
        },
        openTest(test) {
            this.$router.push({
                name: 'home',
                params: {
                    id: test.id
                }
            }); // Navigate to TestView with test ID
        },
    },
    watch: {
        async 'user_store.user'(newUser){
            if (newUser) {
                await this.testManager.fetchTests(); // Refetch when user changes
            }
        }
    },
    async mounted() {
        await this.testManager.fetchTests();

    },
};
</script>

<style scoped>
.tests-browser {
    padding: 16px;
}
</style>