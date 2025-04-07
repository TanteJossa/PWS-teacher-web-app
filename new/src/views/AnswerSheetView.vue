<template lang="pug">
PdfDisplay(
    :source="answer_print"
)
</template>

<script>
// Data 
import answer_print from '@/assets/pdfs/answer_print.pdf'

// Components
import PdfDisplay from '@/components/helpers/PdfDisplay.vue'

export default {
    name: 'AnswerSheetView',
    components: {
        PdfDisplay
    },
    props: {
    
    },
    emits: [],
    setup() {
        return { answer_print }
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
