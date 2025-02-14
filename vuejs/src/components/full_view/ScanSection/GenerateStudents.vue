
<template lang="pug">
h2 Leerlingen laden
div.d-flex.flex-row
    v-btn(text="Laad leerlingen" @click="test.loadStudents()" :loading="test.loading.students")

div.d-flex.flex-row(style="height: calc(100vh - 72px)")
    v-list(:selected="[selected_student_id]" mandatory style="min-width: 155px; overflow-y: scroll")
        v-list-item Leerlingen
        v-divider
        v-list-item(v-for="student in test.students" :value="student.id" @click="$emit('update:selected_student_id', student.id)") {{ student.student_id }}
    v-divider(vertical)
    div.pa-2(v-if="selected_student")
        h2 Leerling {{ selected_student.student_id}}
        v-expansion-panels()
            v-expansion-panel(v-for="(result, index) in selected_student.results" :title="'Vraag '+result.question.question_number")
                v-expansion-panel-text
                    b {{ result.question.question_text }}
                    v-img(style="max-height: 700px; " :src="result.scan.base64Image")
                    v-textarea(label="antwoord leerling" v-model="selected_student.results[index].scan.text" auto-grow :rows="1")
                    v-btn(text="Scan text" @click="test.students[selected_student_index].results[index].scan.extractText(this.test.test_context, this.test.gpt_provider, this.test.gpt_model)" :loading="test.students[selected_student_index].results[index].scan.is_loading")
</template>

<script>
export default {
    name: 'GenerateStudents',
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_student_id: {
            type: String,
            required: true,
        },
        selected_student: {
            type: Object,
            required: false
        },
        selected_student_index: {
            type: Number,
            required: false
        }

    },
    emits: ['update:selected_student_id'],
};
</script>
