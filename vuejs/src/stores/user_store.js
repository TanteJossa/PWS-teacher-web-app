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
        },
        async deleteAccount() {
            if(confirm("Are you sure you want to delete your account? This will delete all your tests as well.")) {
                try {
                    try {
                        const { data, error } = await supabaseAdmin.auth.admin.deleteUser(this.user.uid);

                        if (error) {
                        console.error("Error deleting user:", error);
                        // return { error };
                        }

                        console.log("User deleted successfully:", data);
                        // return { data };

                    } catch (error) {
                        console.error("Unexpected error during user deletion:", error);
                        // return { error: { message: "Unexpected error", details: error.message } };
                    }
                    // await this.$axios.delete('/api/account', { data: { user_id: this.user.id }});
                    await this.signOut()
                    this.$router.push({ name: 'home' });
                } catch(e) {
                    console.error("Error deleting account", e);
                }
            }
        }
    },
});