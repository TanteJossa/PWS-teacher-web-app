
<template lang="pug">
div
    div(v-if="selected_subsection.id == 'individual'" style="position: relative")
        IndividualAnalysis(
            :test="test"
            :selected_student_id="selected_student_id"
            :selected_student="selected_student"
            :is_generating_pdf="is_generating_pdf"
            :self_feedback_field="self_feedback_field"
            @update:selected_student_id="$emit('update:selected_student_id', $event)"
            @update:is_generating_pdf="$emit('update:is_generating_pdf', $event)"
            @update:self_feedback_field="$emit('update:self_feedback_field', $event)"
            @download-student-results="$emit('download-student-results')"
            @download-selected-result="$emit('download-selected-result')"

        )
    div(v-if="selected_subsection.id == 'group'" style="position: relative")
        GroupAnalysis(:test="test")
</template>

<script>
import IndividualAnalysis from '@/components/test/AnalyzeSection/IndividualAnalysis.vue';
import GroupAnalysis from '@/components/test/AnalyzeSection/GroupAnalysis.vue';

export default {
    name: 'AnalyzeSection',
    components: {
        IndividualAnalysis,
        GroupAnalysis,
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true
        },
        selected_student_id: {
            type: String,
            required: true
        },
        is_generating_pdf: {
            type: Boolean,
            required: true,
        },
        self_feedback_field: {
            type: Boolean,
            required: true
        }
    },
    emits: ['update:selected_student_id', "update:is_generating_pdf", 'update:self_feedback_field', 'download-student-results', 'download-selected-result'],
    computed:{
        selected_student(){
            return this.test.students.find(student => student.id == this.selected_student_id)
        }
    },
    methods: {
        getGradeColor(percent){
            
            if (percent < 0.55){
                return 'rgba(255,100,100,'+(-percent + 0.55)+')'

            } 

            return 'rgba(100,255,100,'+(percent - 0.55)+')'
        },
    },
};
</script>
