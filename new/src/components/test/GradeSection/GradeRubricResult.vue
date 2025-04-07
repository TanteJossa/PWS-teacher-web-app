<template lang="pug">
v-table(density="compact")
    thead
        tr
            th Pt.
            th Punt
            th Uitleg
            th.pa-0(style="width: 55px") Behaald
            th(style="width: 35%") Feedback
    tbody
        tr(v-for="(rubric_point, point_index) in result.question.points")
            td {{ rubric_point.point_weight }}
            td {{ rubric_point.point_name }}
            td {{ rubric_point.point_text }}
            td
                v-checkbox.mx-auto(v-model="result.point_results[rubric_point.point_index].has_point" density="compact")

            td.pa-0
                v-textarea(v-model="result.point_results[rubric_point.point_index].feedback" auto-grow :rows="1" density="compact")
b Feedback Volledige vraag
v-textarea(v-model="result.feedback" auto-grow :rows="2" density="compact")
</template>

<script>
// Data 


// Components


export default {
    name: 'GradeRubricResult',
    components: {
    
    },
    props: {
        modelValue: {
            type: Object,
            required: true,
        }
    },
    emits: ['update:modelValue'],
    setup() {

    },
    data(){
        return {
             
        }
    },
    computed: {
        result: {
            get(){
                return this.modelValue
            },
            set(val){
                this.$emit('update:modelValue', val)
            }
        }
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
