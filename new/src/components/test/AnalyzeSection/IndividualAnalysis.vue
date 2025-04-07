
<template lang="pug">
div.d-flex.flex-row.h-100()
    v-list(:selected="[selected_student_id]" mandatory style="width: 155px;")
        v-list-item Leerlingen
        v-btn(@click="$emit('download-student-results')" text="Download Alle")
        v-switch(v-model="self_feedback_field_local" label="Zelfreflectieveld")
        v-divider
        v-list-item(v-for="student in test.students" :value="student.id" @click="$emit('update:selected_student_id', student.id)") {{ student.student_id }}
    v-divider(vertical)
    div.pa-2(style="width: calc(100% - 155px); position: relative;" v-if="selected_student || is_generating_pdf_local")
        div.d-flex.flex-row
            v-btn(@click="$emit('download-selected-result')" text="Download Selected Leerling Resultaten")
        v-progress-linear(v-if="is_generating_pdf_local" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")

        div.individualStudentResult(v-for="student in test.students.filter(student => student?.id == selected_student?.id || is_generating_pdf_local)" :class="student?.id == selected_student?.id ? 'selectedStudentResult' : ''" :style="{ 'background-color': is_generating_pdf_local ? 'white' : '', 'color': is_generating_pdf_local ? 'black' : ''}")
            h1 Leerling: {{ student.student_id }}
            h2 Per vraag

            v-table(:theme=" is_generating_pdf_local ? 'light' : ''")
                thead
                    tr
                        th Vraag
                        th(style="width: 30%") Antwoord
                        th Score
                        th Feedback
                        th(style="width: 30%") Score Per Punt
                tbody
                    tr(v-for="(question, index) in test.questions")
                        td {{ question.question_number }}
                        td
                            v-img(:src="student.question_results[question.id].result.scan?.image.url")
                        td {{ student.question_results[question.id].received_points }} / {{ student.question_results[question.id].total_points }}
                        td {{ student.question_results[question.id].result.feedback }}
                        td
                            v-table(:theme=" is_generating_pdf_local ? 'light' : ''")

                                tbody
                                    tr(v-for="point_result in student.question_results[question.id].result.point_results")
                                        td {{ point_result.point.point_name }}
                                        td(style="width: 50px") {{ point_result.has_point ? point_result.point.point_weight : 0 }}
                                        td(style="width: 50%") {{ point_result.feedback.length > 0 ? point_result.feedback : 'Geen feedback' }}
            h2 Per leerdoel
            v-table(:theme=" is_generating_pdf_local ? 'light' : ''")
                thead
                    tr
                        th Leerdoel
                        th Uitleg leedoel
                        th Punten
                        th Percentage
                tbody
                    tr(v-for="target in test.targets")
                        td {{ target.target_name }}
                        td {{ target.explanation }}
                        td {{ student.target_results[target.id].received_points }} / {{ student.target_results[target.id].total_points }}
                        td {{ student.target_results[target.id].percent }}
</template>

<script>
export default {
    name: 'IndividualAnalysis',
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_student_id: {
            type: String,
            required: true
        },
        selected_student: { // Added to pass selected student
            type: Object,
            required: false // It might not always be selected
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
    computed: {
        is_generating_pdf_local: {
            get() {
                return this.is_generating_pdf
            },
            set(val) {
                this.$emit('update:is_generating_pdf', val)
            }
        },
        self_feedback_field_local: {
            get() {
                return this.self_feedback_field
            },
            set(val) {
                this.$emit('update:self_feedback_field', val)
            }
        }
    }
};
</script>
