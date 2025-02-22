<template lang="pug">
v-container
    v-card
        v-card-title Account Information
        v-card-text
            //- div Username: {{ user_store.user.username }}
            div Email: {{ user_store.user?.email }}
            div Type: Google
        v-card-actions
            v-btn(color="red" @click="user_store.deleteAccount") Delete Account
</template>

<script>
import { useUserStore } from '@/stores/user_store'

export default {
    name: 'AccountView',
    data() {
        return {
        }
    },
    setup() {
        const user_store = useUserStore()
        return {
            user_store
        }

    },

    methods: {

    }
}
</script>

<style scoped>
/* Additional styling as needed */
</style>
