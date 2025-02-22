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
        v-tab(value="admin" v-if="userStore.isAdmin") Admin
    v-tabs-items(v-model="activeTab")
        v-tab-item(value="mytests")
            v-card
                v-card-title My Tests
                v-card-text
                    v-progress-circular(v-if="testManager.loading" indeterminate)
                    v-list(v-else)
                        v-list-item(v-for="test in testManager.filteredTests" :key="test.id" @click="openTest(test)")
                            v-list-item-content
                                v-list-item-title {{ test.name }}
                                v-list-item-subtitle Created at: {{ new Date(test.created_at).toLocaleDateString() }}
                            v-list-item-action
        v-tab-item(value="public")
            v-card
                v-card-title Public Tests
                v-card-text
                    v-progress-circular(v-if="testManager.loading" indeterminate)
                    v-list(v-else)
                        v-list-item(v-for="test in publicTests" :key="test.id" @click="openTest(test)")
                            v-list-item-content
                                v-list-item-title {{ test.name }}
                                v-list-item-subtitle Created at: {{ new Date(test.created_at).toLocaleDateString() }}
        v-tab-item(value="admin" v-if="userStore.isAdmin")
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
                            v-list-item-content
                                v-list-item-title {{ test.name }} - {{ test.user_id }}  //Using user_id for now, in order to use user.username all the users need to be loaded
                            v-list-item-action
</template>

<script>
import {
    TestManager
} from '@/scan_api_classes'; // Import TestManager
import {
    useUserStore
} from '@/stores/user_store';
import {
    onMounted,
    ref,
    computed,
    watch
} from 'vue';


export default {
    name: 'TestsBrowser',
    setup() {
        const testManager = new TestManager();
        const userStore = useUserStore();
        const activeTab = ref('mytests');
        const adminSearchQuery = ref('');

        onMounted(async () => {
            await testManager.fetchTests();

        });

        // Computed property for public tests (filters from all loaded tests)
        const publicTests = computed(() => {
            return testManager.tests.filter(test => test.is_public);
        });

        // Computed property for admin-filtered tests
        const filteredAdminTests = computed(() => {
            if (!userStore.isAdmin) {
                return [];
            }
            if (!adminSearchQuery.value) {
                return testManager.tests;
            }
            // You'll need to fetch the user's username for this to work.
            // For simplicity, I'm assuming a 'username' field exists. Adapt as needed.
            return testManager.tests.filter(test =>
                test.user_id.toLowerCase().includes(adminSearchQuery.value.toLowerCase()) // Placeholder for user search
            );
        });


        // Watcher for user changes
        watch(() => userStore.user, async (newUser) => {
            if (newUser) {
                await testManager.fetchTests(); // Refetch when user changes
            }
        }, {
            immediate: true
        }); // Immediate: true to run on component creation

        return {
            testManager,
            userStore,
            activeTab,
            adminSearchQuery,
            publicTests,
            filteredAdminTests,

        };
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
};
</script>

<style scoped>
.tests-browser {
    padding: 16px;
}
</style>