<template lang="pug">
v-progress-linear(indeterminate)
h1 Toets aan het maken
</template>

<script>
// Data 
import {
    delay
} from '@/helpers'
import {
    TestManager
} from '@/scan_api_classes'

// Components


export default {
    name: 'NewTest',
    components: {
    
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
        await delay(1000)

        this.$router.push({
            name: 'test',
            params: {
                id: 'null'
            }
        })

        

    },
}
</script>
    
<style scoped>
    
</style>
