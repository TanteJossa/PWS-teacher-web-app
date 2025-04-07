<template lang="pug">
PdfDisplay(
    :source="pws"
)
</template>

<script>
// Data 
import pws from '@/assets/pdfs/PWS-NakijkenMetAI.pdf'



// Components
import PdfDisplay from '@/components/helpers/PdfDisplay.vue'

export default {
    name: 'PdfView',
    components: {
        PdfDisplay
    },
    props: {
    
    },
    emits: [],
    setup() {
        return {pws}
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
    mounted() {
    
    },
    
    
}
</script>
    
<style scoped>
    
</style>
