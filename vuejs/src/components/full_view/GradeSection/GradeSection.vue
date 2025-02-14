
<template lang="pug">
//- div(v-if="selected_subsection.id == 'grade_students'" style="position: relative")
div
    GradeStudents(
        :test="test"
        v-model:selected_student_id="_selected_student_id"
        :selected_student="selected_student"
        @update:selected_student_id="selected_student_id = $event"
    )
</template>

<script>
import GradeStudents from '@/components/full_view/GradeSection/GradeStudents.vue';

export default {
    name: 'GradeSection',
    components: {
        GradeStudents,
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
            required: false
        },
        selected_student: {
            type: Object,
            required: false
        },
    },
    emits: ['update:selected_student_id'],
    computed: {
        _selected_student_id: {
            get() {
                return this.selected_student_id
            },
            set(val) {
                this.$emit('update:selected_student_id', val)
            }
        }
    }
};
</script>
