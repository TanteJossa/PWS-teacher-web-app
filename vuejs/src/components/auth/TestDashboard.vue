<template lang="pug">
div
    v-card(class="mb-4")
        v-card-title My Tests
        v-card-text
            v-btn(color="primary" @click="createTestDialog = true" :disabled="!user") Create New Test
            v-list(v-if="tests.length > 0")
                v-list-item(v-for="test in tests" :key="test.id")
                    v-list-item-title {{ test.name }}
                    v-list-item-subtitle Created at: {{ new Date(test.created_at).toLocaleDateString() }}
            v-card-text(v-else) No tests created yet.
            v-card-text(v-if="!user") Please sign in to create and view tests.
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
import { supabase } from '@/supabase' // Assuming you set up supabase.js

export default {
    props: {
        user: { // ADDED: Prop to receive user object
            type: Object,
            default: null
        }
    },
    data() {
        return {
            tests: [],
            error: null,
            createTestDialog: false,
            newTestName: '',
            isCreatingTest: false
        }
    },
    watch: {
        user: { // Watch for user changes and refetch tests
            handler: 'fetchUserTests',
            immediate: true
        }
    },
    methods: {
        async fetchUserTests() {
            if (!this.user) { // Only fetch if user is logged in
                this.tests = []; // Clear existing tests if no user
                return;
            }
            this.error = null
            try {
                const { data, error: fetchError } = await supabase
                    .from('tests')
                    .select('*')
                    .eq('user_id', this.user.id) // ADDED: Filter by user_id
                    .order('created_at', { ascending: false })
                if (fetchError) {
                    this.error = fetchError.message
                    console.error("Fetch Tests Error:", fetchError)
                } else {
                    this.tests = data || []
                }
            } catch (err) {
                this.error = err.message
                console.error("Unexpected Fetch Tests Error:", err)
            }
        },
        async createNewTest() {
            if (!this.user) return; // Prevent creation if no user
            this.isCreatingTest = true
            this.error = null
            try {
                const { data, error: createError } = await supabase
                    .from('tests')
                    .insert([{
                        name: this.newTestName,
                        user_id: this.user.id // ADDED: Include user_id
                    }])
                    .select()

                if (createError) {
                    this.error = createError.message
                    console.error("Create Test Error:", createError)
                } else {
                    this.tests.push(data[0]) // Add the new test to the list
                    this.createTestDialog = false
                    this.newTestName = ''
                }
            } catch (err) {
                this.error = err.message
                console.error("Unexpected Create Test Error:", err)
            } finally {
                this.isCreatingTest = false
            }
        }
    }
}
</script>