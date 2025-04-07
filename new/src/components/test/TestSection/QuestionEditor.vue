
<template lang="pug">
div.d-flex.flex-row
    div(v-if="!hideOrderButtons")
        v-icon(icon="mdi-chevron-up" :disabled="index == 0" @click="moveQuestionUp")
        v-icon(icon="mdi-chevron-down" :disabled="index == test.questions.length - 1" @click="moveQuestionDown")
        v-dialog(max-width="700" )
            template(v-slot:activator="{ props: activatorProps }")
                v-icon(icon="mdi-delete" color="red" v-bind="activatorProps")

            template(v-slot:default="{ isActive }")
                v-card(title="Params")
                    v-card-text
                        v-btn(density="compact"  @click="deleteQuestion" color="error") verwijder

    h3 {{ question.question_number + '. ' }}
    MarkTexField(
        style="width: calc(( 100% - 160px ) / 2)"
        v-model="question.question_context" 
        label="Context" 

    )
    MarkTexField(
        style="width: calc(( 100% - 160px ) / 2)"

        v-model="question.question_text" 
        label="Vraag text"
        
    )
    v-switch(v-model="question.is_draw_question" label="Tekenvraag")

RubricEditor(
    v-model="question" :hideTargetPointSelection="hideTargetPointSelection"
)
</template>

<script>
import RubricEditor from '@/components/test/TestSection/RubricEditor.vue';
import MarkTexField from '@/components/helpers/MarkTexField.vue';

export default {
    name: 'QuestionEditor',
    components: {
        RubricEditor,
        MarkTexField
    },
    emits: ['update:modelValue'],
    props: {
        modelValue: {
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
        },
        hideOrderButtons: {
            type: Boolean,
            default: false
        },
        hideTargetPointSelection: {
            type: Boolean,
            default: false
        }
    },
    computed: {
        question: {
            get(){
                return this.modelValue
            },
            set(val){
                this.$emit('update:modelValue', val)
            }
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
