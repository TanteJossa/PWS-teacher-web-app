
<template lang="pug">
div.pa-2(style="position: relative")
    h2 Per leerling
    v-table(density="compact")
        thead
            tr
                th Leerling
                th(v-for="question in test.questions") {{question.question_number}}
                th totaal
                th %
        tbody
            tr(v-for="student in test.students")
                td(style="height: fit-content") {{ student.student_id }}
                td(style="height: fit-content" v-for="question in test.questions") {{ student.question_results[question.id].received_points }} / {{ student.question_results[question.id].total_points }}
                td(style="height: fit-content") {{ student.received_points }} / {{ test.total_points }}
                td(style="height: fit-content" :style="{'background-color': getGradeColor(student.received_points / test.total_points)}") {{ (student.received_points / test.total_points * 100).toFixed(1) }}%
            tr
                th Totaal
                th(v-for="question in test.questions") {{ average(test.students.map(e => e.question_results[question.id].received_points)).toFixed(2) }}
                th {{ average(test.students.map(e => e.received_points / test.total_points * 100)).toFixed(1) }}

    h2 Per Leerdoel
    h2 Per leerdoel
    v-table(:theme=" is_generating_pdf ? 'light' : ''")
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
                td {{ target.average_received_points }} / {{ target.total_points }}
                td(:style="{'background-color': getGradeColor(target.average_received_points / target.total_points)}") {{ target.percent }}
</template>

<script>
import { average } from '@/helpers'
export default {
    name: 'GroupAnalysis',
    props: {
        test: {
            type: Object,
            required: true,
        },
        is_generating_pdf: {  // Assuming you might want this here too
            type: Boolean,
            required: false,  // Probably not required at the group level
            default: false,
        },
    },
    setup(){
        return {
            average
        }
    },
    methods: {
        getGradeColor(percent) {
            return this.$parent.getGradeColor(percent)  // Reuse from parent
        },
    },
};
</script>
