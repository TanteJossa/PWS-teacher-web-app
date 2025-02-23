<template lang="pug">
v-card(v-if="userStore.user" class="pa-4")
    v-card-title User Profile
    v-card-text
        p Email: {{ userStore.user.email }}
        p User ID: {{ userStore.user.id }}
        p Admin: {{ userStore.user.admin }}
    v-card-actions
        v-btn(color="secondary" @click="signOut") Sign Out
v-card(v-else class="pa-4")
    v-card-title Not Logged In
    v-card-text
        p Please sign in to view your profile.
v-alert(v-if="error" type="error" dismissible) {{ error }}
</template>

<script>
import { useUserStore } from '@/stores/user_store';  // Use Pinia store

export default {
    data() {
        return {
            error: null,
            userStore: useUserStore(), // Get the store instance in data()
        }
    },
    methods: {
        async signOut() {
            this.error = null;
            // const userStore = useUserStore();  // Moved to data()
            try {
                await this.userStore.signOut(); // Use Pinia action
            } catch (err) {
                this.error = err.message;
                console.error("Unexpected Sign-out Error:", err);
            }
        }
    }
}
</script>