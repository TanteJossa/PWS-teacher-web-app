<template lang="pug">
v-app
    v-toolbar(app color="primary" dark density="compact")
        v-toolbar-title Toets PWS
        v-toolbar-items


            v-btn(text @click="navigate('tests')") Tests
            //- v-btn(text v-if="user_store.user" @click="navigate('home')") Maak en Scan
            v-btn(text  @click="navigate('pdf')") Bekijk PWS
            v-btn(
                text="Antwoordpagina"
                @click="navigate('answer_sheet')"
            )
            v-btn(text v-if="!user_store.user" @click="signInWithGoogle") Login with Google
            v-btn(text v-if="user_store.user" @click="navigate('account')") Account
            v-btn(text v-if="user_store.user" @click="signOut") Logout

    v-main
        router-view.w-100(style="height: calc(100% - 48px)")

</template>

<script>
import {
    useUserStore
} from '@/stores/user_store';



export default {
    name: 'App',
    setup() {
        const user_store = useUserStore();

        return {
            user_store
        }
    },
    methods: {
        navigate(route) {
            this.$router.push({
                name: route
            });
        },
        async signInWithGoogle() {
            await this.user_store.signInWithGoogle()
        },
        async signOut() {
            await this.user_store.signOut();
            this.$router.push({
                name: 'home'
            });
        },
    },
     mounted() {
        this.user_store.initializeAuthListener(); // Initialize the listener ONCE
    },
    beforeUnmount() {
      this.user_store.stopAuthListener(); // Stop listening to auth state changes, cleanup.
    }
}
</script>

<style scoped>
/* Add additional styling as needed */
</style>