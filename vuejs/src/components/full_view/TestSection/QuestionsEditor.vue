
<template lang="pug">
div
    h2.ml-4 Vragen
    div
        transition-group
            v-card.ma-2(v-for="(question, index) in test.questions" :key="index")
                v-card-text
                    QuestionEditor(:question="question" :index="index" :test="test")
        v-btn.ml-4(prepend-icon="mdi-plus" text="Voeg eigen vraag toe" @click="test.addQuestion({})")
        v-divider.ma-4
        GenerateQuestion(:test="test")
</template>

<script>
import QuestionEditor from '@/components/full_view/TestSection/QuestionEditor.vue';
import GenerateQuestion from '@/components/full_view/TestSection/GenerateQuestion.vue';
export default {
    name: 'QuestionsEditor',
    components: {
        QuestionEditor,
        GenerateQuestion
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
    },
};
</script>
