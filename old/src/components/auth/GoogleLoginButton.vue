// src/components/auth/GoogleLoginButton.vue
<template lang="pug">
v-btn(color="primary" @click="signInWithGoogle" :loading="loading")
    v-icon(left icon="mdi-google")
    | Sign in with Google
    v-overlay(v-if="loading" :value="loading" persistent)
        v-progress-circular(indeterminate color="primary")
    v-alert(v-if="error" type="error" dismissible) {{ error }}
</template>

<script>
import { useUserStore } from '@/stores/user_store'; // Import user store

export default {
    data() {
        return {
            error: null,
            loading: false
        }
    },
    methods: {
        async signInWithGoogle() {
            this.loading = true;
            this.error = null;
            const userStore = useUserStore(); // Get the store instance
            try {
                await userStore.signInWithGoogle(); // Call the action
            } catch (err) {
                this.error = err.message;
                console.error("Unexpected Google Sign-in Error:", err);
            } finally {
                this.loading = false;
            }
        }
    }
}
</script>