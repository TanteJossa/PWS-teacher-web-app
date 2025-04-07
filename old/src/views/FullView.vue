<template lang="pug">
v-app
    v-main

</template>

<script>
// Data 


// Components
import GoogleLoginButton from '@/components/auth/GoogleLoginButton.vue'
import UserProfile from '@/components/auth/UserProfile.vue'
import TestDashboard from '@/components/auth/TestDashboard.vue'

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
        }
    },
    computed: {
    
    },
    methods: {

    },
    watch: {
    
    },
    // created() {
    
    // },
    async mounted() {

    },
    
    
}
</script>
    
<style scoped>
    
</style>
