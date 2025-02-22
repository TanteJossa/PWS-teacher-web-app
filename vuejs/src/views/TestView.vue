<template lang="pug">
v-container
    v-card(v-if="test")
        v-card-title
            span(v-if="!isEditing") {{ test.name }}
            v-text-field(v-else v-model="test.name" label="Test Name")
            v-spacer
            v-btn(v-if="isEditing" color="primary" @click="saveTest" :loading="isSaving") Save
            v-btn(v-if="isEditing" color="error" @click="deleteTest") Delete Test
        v-card-text
            div(v-if="!isEditing")
                p Display Mode
                MainLayout(
                    :test="test"
                )
                v-btn(v-if="canEdit" color="warning" @click="isEditing = true") Edit
            div(v-else)
                MainLayout(
                    :test="test"
                )
        v-card-actions
            v-btn(text @click="goBack") Back
    v-progress-circular(v-else indeterminate)
</template>

<script>
import {
    TestManager,
    Test
} from '@/scan_api_classes';
import {
    useUserStore
} from '@/stores/user_store';
import {
    onMounted,
    ref,
    computed,
    watch
} from 'vue';
import MainLayout from '@/components/full_view/MainLayout.vue';

export default {
    name: 'TestView',
    components: {
        MainLayout
    },
    setup(props, context) { // Use setup for Composition API
        const testManager = new TestManager();
        const userStore = useUserStore();
        const test = ref(null); // Use ref for reactivity
        const isEditing = ref(false);
        const isSaving = ref(false);

        // Computed property to check if the current user can edit the test
        const canEdit = computed(() => {
            return userStore.user && (userStore.user.id === test.value?.user_id || userStore.isAdmin);
        });

        const route = context.root.$route

        const loadTest = async () => {
            try {
                const testId = route.params.id
                console.log(testId)
                if (testId) {
                    test.value = await testManager.fetchTest(testId); // Use TestManager
                    if (!test.value) {
                        console.warn('test not found')
                    }
                }

            } catch (error) {
                console.error("Failed to load test:", error);
            }
        }

        onMounted(async () => {
            await loadTest()
        });

        watch(() => route.params, async () => { //watch for url change
            await loadTest()
        })

        const saveTest = async () => {
            isSaving.value = true;
            try {
                await test.value.saveToDatabase(); // Use Test class method
                isEditing.value = false; // Exit edit mode on successful save
            } catch (error) {
                console.error("Error saving test:", error);
            } finally {
                isSaving.value = false;
            }
        };

        const deleteTest = async () => {
            if (confirm("Are you sure you want to delete this test?  This is irreversible.")) {
                try {
                    await testManager.deleteTest(test.value.id);
                    context.root.$router.push({
                        name: 'tests'
                    }); // Navigate back to test list
                } catch (error) {
                    console.error("Error deleting test:", error);
                }
            }
        };

        const goBack = () => {
            context.root.$router.push({
                name: 'tests'
            });
        }


        return {
            test,
            isEditing,
            isSaving,
            canEdit, // Expose computed property
            saveTest,
            deleteTest,
            goBack
        };
    },
};
</script>

<style scoped>
/* Add styling as needed */
</style>