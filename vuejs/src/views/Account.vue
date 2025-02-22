<template lang="pug">
v-container
    v-card
        v-card-title Account Information
        v-card-text
            div Username: {{ user.username }}
            div Email: {{ user.email }}
        v-card-actions
            v-btn(color="red" @click="deleteAccount") Delete Account
</template>

<script>
export default {
    name: 'Account',
    data() {
        return {
            user: {}
        }
    },
    created() {
        // Replace with your actual user retrieval logic.
        this.user = this.$store.state.user;
    },
    methods: {
        async deleteAccount() {
            if(confirm("Are you sure you want to delete your account? This will delete all your tests as well.")) {
                try {
                    await this.$axios.delete('/api/account', { data: { user_id: this.user.id }});
                    this.$store.commit('setUser', null);
                    this.$router.push({ name: 'home' });
                } catch(e) {
                    console.error("Error deleting account", e);
                }
            }
        }
    }
}
</script>

<style scoped>
/* Additional styling as needed */
</style>
