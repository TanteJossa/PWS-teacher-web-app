
<template lang="pug">
v-card.ma-2()
    v-card-text
        h3 Genereer nieuwe vraag
        v-radio-group(v-model="test.gpt_question.rtti" inline label="Vraag type")
            v-radio(value="Reproductie" label="Reproductie")
            v-radio(value="Training" label="Training")
            v-radio(value="Transfer" label="Transfer")
            v-radio(value="Inzicht" label="Inzicht")
            v-radio(value="Maakt niet uit" label="Maakt niet uit")
        v-text-field(label="Idee/onderwerp" v-model="test.gpt_question.subject")
        v-number-input(v-model="test.gpt_question.point_count" type="number" :min="0" controlVariant="stacked" density="compact" label="max aantal punten")
        div
            p.text-gray Leerdoel (niets selecteren = alle leerdoelen)
            v-checkbox(v-for="target in test.targets" :label="target.target_name" :modelValue="test.gpt_question.targets[target.id]" @update:modelValue="test.gpt_question.targets[target.id] = !test.gpt_question.targets[target.id]" density="compact")
        v-btn(@click="test.generateGptQuestion()") Genereer vraag
</template>

<script>
export default {
    name: 'GenerateQuestion',
    props: {
        test: {
            type: Object,
            required: true
        }
    }
}
</script>
