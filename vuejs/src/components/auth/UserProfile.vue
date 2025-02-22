// src/components/auth/UserProfile.vue
<template lang="pug">
v-card(v-if="user" class="pa-4")
    v-card-title User Profile
    v-card-text
        p Email: {{ user.email }}
        p User ID: {{ user.id }}
    v-card-actions
        v-btn(color="secondary" @click="signOut") Sign Out
v-card(v-else class="pa-4")
    v-card-title Not Logged In
    v-card-text
        p Please sign in to view your profile.
v-alert(v-if="error" type="error" dismissible) {{ error }}
</template>

<script>
import { supabase } from '@/supabase' // Assuming you set up supabase.js

export default {
    data() {
        return {
            error: null
        }
    },
    props: {
        user: {
            type: Object,
            default: null
        }
    },
    mounted() {
        this.fetchUserProfile()
    },
    emits: ['updateUser'],
    methods: {
        async fetchUserProfile() {
            this.error = null
            try {
                const { data: { user: currentUser }, error: profileError } = await supabase.auth.getUser()
                if (profileError) {
                    this.error = profileError.message
                    console.error("Profile Fetch Error:", profileError)
                } else {
                    this.$emit('updateUser', currentUser)
                }
            } catch (err) {
                this.error = err.message
                console.error("Unexpected Profile Fetch Error:", err)
            }
        },
        async signOut() {
            this.error = null
            try {
                const { error: signOutError } = await supabase.auth.signOut()
                if (signOutError) {
                    this.error = signOutError.message
                    console.error("Sign-out Error:", signOutError)
                } else {
                    this.$emit('updateUser', null )
                    // Optionally redirect to login page here
                }
            } catch (err) {
                this.error = err.message
                console.error("Unexpected Sign-out Error:", err)
            }
        }
    }
}
</script>