
<template lang="pug">
div.d-flex.flex-row
    div
        v-icon(icon="mdi-chevron-up" :disabled="index == 0" @click="moveQuestionUp")
        v-icon(icon="mdi-chevron-down" :disabled="index == test.questions.length - 1" @click="moveQuestionDown")
        v-icon(icon="mdi-delete" color="red" @click="deleteQuestion")
    h3 {{ question.question_number + '. ' }}
    v-textarea(v-model="question.question_context" label="Context" auto-grow :rows="1")
    v-textarea(v-model="question.question_text" label="Vraag text" auto-grow :rows="1")
    v-switch(v-model="question.is_draw_question" label="Tekenvraag")

RubricEditor(:question="question")
</template>

<script>
import RubricEditor from '@/components/full_view/TestSection/RubricEditor.vue';

export default {
    name: 'QuestionEditor',
    components: {
        RubricEditor,
    },
    props: {
        question: {
            type: Object,
            required: true,
        },
        index: {
            type: Number,
            required: true
        },
        test: {
            type: Object,
            required: true
        }
    },
    methods: {
        moveQuestionUp() {
            if (this.index > 0) {
                [this.test.questions[this.index], this.test.questions[this.index - 1]] = [this.test.questions[this.index - 1], this.test.questions[this.index]];
                this.test.setQuestionNumbers();
            }
        },
        moveQuestionDown() {
            if (this.index < this.test.questions.length - 1) {
                [this.test.questions[this.index], this.test.questions[this.index + 1]] = [this.test.questions[this.index + 1], this.test.questions[this.index]];
                this.test.setQuestionNumbers();
            }
        },
        deleteQuestion() {
            this.test.questions.splice(this.index, 1);
            this.test.setQuestionNumbers();

        },
    },
};
</script>
