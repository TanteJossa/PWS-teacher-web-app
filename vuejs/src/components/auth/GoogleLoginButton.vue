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
import { supabase } from '@/supabase' // Assuming you set up supabase.js

export default {
    data() {
        return {
            error: null,
            loading: false
        }
    },
    methods: {
        async signInWithGoogle() {
            this.loading = true
            this.error = null
            try {
                const { error: authError } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                })
                if (authError) {
                    this.error = authError.message
                    console.error("Google Sign-in Error:", authError)
                }
            } catch (err) {
                this.error = err.message
                console.error("Unexpected Google Sign-in Error:", err)
            } finally {
                this.loading = false
            }
        }
    }
}
</script>