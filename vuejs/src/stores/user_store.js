// @/stores/user_store.js
import {
    defineStore
} from 'pinia';
import {
    supabase
} from '@/supabase'; // Your Supabase client

export const useUserStore = defineStore('user', {
    state: () => ({
        user: null,
    }),
    actions: {
        async fetchUser() {
            const {
                data: {
                    user
                }
            } = await supabase.auth.getUser()
            this.user = user;

        },
        async signInWithGoogle() {
            const {
                data,
                error
            } = await supabase.auth.signInWithOAuth({
                provider: 'google',
            });
            if (error) {
                console.error('Google Sign-In Error:', error);
            }
            // The redirect should handle setting the user
        },
        async signOut() {
            const {
                error
            } = await supabase.auth.signOut();
            if (error) {
                console.error('Sign-Out Error:', error);
            }
            this.user = null;
        },
        async handleAuthStateChange() {
            supabase.auth.onAuthStateChange((event, session) => {
                console.log('auth change:', event, session)
                this.user = session?.user || null;
            });
        }
    },
});