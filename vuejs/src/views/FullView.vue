<template lang="pug">
v-app
    v-main
        GoogleLoginButton
        UserProfile(
            :user="user"
            @updateUser="setUser"
        )
        TestDashboard(
            :user="user"
        )
</template>

<script>
// Data 


// Components
import GoogleLoginButton from '@/components/auth/GoogleLoginButton.vue'
import UserProfile from '@/components/auth/UserProfile.vue'
import TestDashboard from '@/components/auth/TestDashboard.vue'
import { supabase } from '@/supabase.js'

export default {
    name: 'FullView',
    components: {
        GoogleLoginButton,
        UserProfile,
        TestDashboard,
    },
    props: {
    
    },
    emits: [],
    setup() {
        
    },
    data(){
        return {
            user: null 
        }
    },
    computed: {
    
    },
    methods: {
        setUser(updatedUser) { // Method to update user state
            this.user = updatedUser;
        },
    },
    watch: {
    
    },
    // created() {
    
    // },
    async mounted() {
        const { data: { user: initialUser } } = await supabase.auth.getUser();
        
        this.user = initialUser;
    },
    
    
}
</script>
    
<style scoped>
    
</style>
