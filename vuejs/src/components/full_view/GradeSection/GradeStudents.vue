
<template lang="pug">
h2 Leerlingen laden
div.d-flex.flex-row
    v-btn(text="Kijk alle leerlingen na" @click="test.gradeStudents()" :loading="test.loading.grading")
div.d-flex.flex-row.w-100(style="height: calc(100dvh - 72px)")
    v-list(:selected="[selected_student_id]" mandatory style="min-width: 155px; overflow-y: scroll")
        v-list-item Leerlingen
        v-divider
        v-list-item(v-for="student in test.students" :value="student.id" @click="$emit('update:selected_student_id', student.id)")
            v-progress-linear(v-if="student.is_grading" indeterminate)
            p {{ student.student_id }}
    v-divider(vertical)
    div.pa-2(v-if="selected_student" style="position: relative; overflow-y: scroll; width: calc(100% - 155px)")
        h2 Leerling {{ selected_student.student_id}}
        v-btn(text="Kijk leerling na" @click="test.students[selected_student_index].grade()" :loading="selected_student.is_grading")
        v-progress-linear(v-if="selected_student.is_grading" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")

        v-expansion-panels()
            v-expansion-panel(v-for="(result, index) in selected_student.results" :title="'Vraag '+result.question.question_number")
                v-expansion-panel-text
                    v-btn(@click="test.students[selected_student_index].results[index].grade()" :loading="selected_student.results[index].is_grading") Kijk vraag na
                    br
                    b Vraag:
                    p {{ result.question.question_text }}

                    b Antwoord Leerling:
                    v-img(style="max-height: 700px; " :src="result.scan.base64Image")
                    p {{ selected_student.results[index].scan.text }}

                    b Rubric
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
                                    v-checkbox.mx-auto(v-model="selected_student.results[index].point_results[rubric_point.point_index].has_point" density="compact")

                                td.pa-0
                                    v-textarea(v-model="selected_student.results[index].point_results[rubric_point.point_index].feedback" auto-grow :rows="1" density="compact")
                    b Feedback Volledige vraag
                    v-textarea(v-model="selected_student.results[index].feedback" auto-grow :rows="2" density="compact")
</template>

<script>
export default {
    name: 'GradeStudents',
    props: {
        test: {
            type: Object,
            required: true,
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
    computed: {
        selected_student_index() {
            return this.test.students.findIndex(e => e.id == this.selected_student_id);
        },
    },
    emits: ['update:selected_student_id']
};
</script>
