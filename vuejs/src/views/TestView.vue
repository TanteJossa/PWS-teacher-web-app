<template lang="pug">
div.h-100
    div.h-100(v-if="test")
        div
            v-btn(text @click="goBack") Back
            span(v-if="!is_editing") {{ test.name }}
            div(v-else)
                v-text-field(v-model="test.name" label="Test Name")
                v-checkbox(
                    label="Publiek"
                    v-model="test.is_public"
                )
            v-spacer
            
            v-btn(v-if="is_editing" color="primary" @click="saveTest" :loading="is_saving") Save
            v-btn(v-if="is_editing" color="error" @click="deleteTest") Delete Test
            v-btn(v-else color="primary" @click="is_editing = true") Edit

        div.h-100(v-if="!is_editing")
            p Display Mode
            MainLayout.h-100(
                :test="test"

            )
            v-btn(v-if="canEdit" color="warning" @click="is_editing = true") Edit
        div.h-100(v-else)
            MainLayout.h-100(
                :test="test"
                @save="saveTest"
                @delete="deleteTest"
            )
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
import MainLayout from '@/components/full_view/MainLayout.vue';
import { getRandomID } from '@/helpers';

export default {
    name: 'TestView',
    components: {
        MainLayout
    },
    data() {
        return {
            test_manager: new TestManager(),
            user_store: useUserStore(),
            test: null,
            is_editing: false,
            is_saving: false,
        };
    },
    computed: {
        canEdit() {
            return this.user_store.user && (this.user_store.user.id === this.test?.user_id || this.user_store.isAdmin);
        }
    },
    watch: {
        '$route.params': {
            handler: 'loadTest',
            immediate: true // Load on component creation as well
        }
    },
    mounted() {
        this.loadTest();
    },
    methods: {
        async loadTest() {
            try {
                var testId = this.$route.params.id;
                if (testId == 'null'){
                    // testId = null;

                    // go to test creation
                    

                } else {

                    // if (testId) {
                    this.test = await this.test_manager.fetchTest(testId);
                }
                // }
            } catch (error) {
                console.error("Failed to load test:", error);
            }
            if (!this.test) {
                console.warn('test not found');
                
                this.test = new Test({});
                this.test.id = getRandomID();
                this.test.user_id = this.user_store.user?.id;
                this.test.name = 'New Test';
                history.replaceState({}, null,'/test/'+ this.test.id);
            }
        },
        async saveTest() {
            this.is_saving = true;
            try {
                await this.test.saveToDatabase();
                this.$router.push({
                    name: 'test',
                    params: {
                        id: this.test.id
                    }
                });
                this.is_editing = false;
            } catch (error) {
                console.error("Error saving test:", error);
            } finally {
                this.is_saving = false;
            }
        },
        async deleteTest() {
            if (confirm("Are you sure you want to delete this test?  This is irreversible.")) {
                try {
                    await this.test_manager.deleteTest(this.test.id);
                    this.$router.push({
                        name: 'tests'
                    });
                } catch (error) {
                    console.error("Error deleting test:", error);
                }
            }
        },
        goBack() {
            this.$router.push({
                name: 'tests'
            });
        }
    },
};
</script>

<style scoped>
/* Add styling as needed */
</style>