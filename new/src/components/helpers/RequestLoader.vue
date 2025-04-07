<template lang="pug">
v-overlay.d-flex.align-center.justify-center.flex-column(
    :modelValue="true"
    persistent
    contained
)
    div.d-flex.align-center.justify-center.flex-column
        v-progress-circular(indeterminate size="60")
        h2 {{ current_request_status}}

</template>

<script>
// Data 

// Components


export default {
   name: 'RequestLoader',
   components: {
   
   },
   props: {
    current_request_status: {
        type: String,
        default: ""
    }
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
   mounted() {
   },
   
   
}
</script>
   
<style scoped>

</style>
