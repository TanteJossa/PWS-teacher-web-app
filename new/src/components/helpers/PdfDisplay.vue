<template lang="pug">
.pdf-viewer-container.h-100
    v-btn(@click="$router.go(-1)") Terug
    object.w-100(style="height: calc(100% - 40px)" :data="source" type="application/pdf" class="internal")

</template>

<script>
// Data 


// Components


export default {
    name: 'PdfDisplay',
    components: {
    
    },
    props: {
        source: {
            required: true
        }
    },
    emits: [],
    setup() {
        
    },
    data(){
        return {
                src: null
        }
    },
    computed: {

    },
    methods: {
    
    },
    watch: {
    
    },
    // async created() {
    // },
    mounted() {
        
    },
    
    
}
</script>
    
<style scoped>
    
</style>
