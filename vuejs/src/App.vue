<template lang="pug">
v-app
    v-app-bar(app color="primary" dark)
        v-toolbar-title Toets PWS
        v-spacer
        v-btn(text @click="navigate('tests')") Tests
        v-btn(text v-if="user" @click="navigate('home')") Maak en Scan
        v-btn(text  @click="navigate('pdf')") Bekijk PWS
        v-btn(text v-if="!user" @click="signInWithGoogle") Login with Google
        v-btn(text v-if="user" @click="navigate('account')") Account
        v-btn(text v-if="user" @click="signOut") Logout

    v-main
        router-view(@update:user="setUser")

</template>

<script>
import {
    useUserStore
} from '@/stores/user_store';
import {
    onMounted,
    computed
} from 'vue';
import {
    supabase
} from '@/supabase.js'

export default {
    name: 'App',
    setup() {
        const userStore = useUserStore();

        // Use computed property for user
        const user = computed(() => userStore.user);
        const isAdmin = computed(() => userStore.isAdmin);

        onMounted(async () => {
            await userStore.fetchUser(); // Fetch user on mount.
            userStore.handleAuthStateChange(); // Set up the auth state listener
        });

        return {
            user, // Return the computed property.
            isAdmin,
            userStore
        }
    },
    methods: {
        navigate(route) {
            this.$router.push({
                name: route
            });
        },
        async signInWithGoogle() {
            await this.userStore.signInWithGoogle()
        },
        async signOut() {
            await this.userStore.signOut();
            this.$router.push({
                name: 'home'
            });
        },
        setUser(updatedUser) { // Method to update user state from child components
            this.userStore.user = updatedUser;
        },
    }
}
</script>

<style scoped>
/* Add additional styling as needed */
</style>