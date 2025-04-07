
<template lang="pug">
b Rubric
v-table(density="compact")
    thead
        tr
            th(style="width: 80px") Pt.
            th(style="width: 150px") Kort
            th Lang
            th(v-if="!hideTargetPointSelection") Leerdoel
            th(width="55px")
    tbody
        tr(v-for="(rubric_point, point_index) in question.points")
            td.pa-0
                v-number-input(v-model="question.points[point_index].point_weight" type="number" :min="0" controlVariant="stacked" density="compact")
            td.pa-0
                v-textarea(v-model="question.points[point_index].point_name" density="compact" multi-line auto-grow :rows="1")
            td.pa-0
                MarkTexField(v-model="question.points[point_index].point_text")
            td.pa-0(v-if="!hideTargetPointSelection")
                v-select(:items="test.targets.map((e,index) => {return {name: e.target_name, id: e.id}})" :modelValue="question.points[point_index].target_id" item-title="name" item-value="id" density="compact" @update:model-value="question.points[point_index].target_id = $event")
            td.pa-0
                v-icon(icon="mdi-delete" color="red" @click="question.points.splice(point_index,1)")
v-btn(prepend-icon="mdi-plus" text="Voeg punt toe" @click="question.addRubricPoint({})")
</template>

<script>
import MarkTexField from '@/components/helpers/MarkTexField.vue';


export default {
    name: 'RubricEditor',
    components: {
        MarkTexField
    },
    props: {
        modelValue: {
            type: Object,
            required: true,
        },
        hideTargetPointSelection: {
            type: Boolean,
            default: false
        }
    },
    emits: [
        'update:modelValue'
    ],
    computed: {
        test() {
            return this.question.test
        },
        question: {
            get(){
                return this.modelValue
            },
            set(val){
                this.$emit('update:modelValue', val)
            }
        }
    }
};
</script>
