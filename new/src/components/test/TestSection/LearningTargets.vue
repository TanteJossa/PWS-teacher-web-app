
<template lang="pug">
div
    h2.ml-4 Leerdoelen
    v-table.ma-2(density="compact" style="border-radius: 5px")
        thead
            tr
                th Naam
                th Uitleg
                th(width="55px")
        tbody
            tr(v-for="(target, index) in test.targets")
                td.pa-0
                    v-textarea(v-model="test.targets[index].target_name" density="compact" auto-grow :rows="1")
                td.pa-0
                    MarkTexField(v-model="test.targets[index].explanation")
                td.pa-0
                    v-icon(icon="mdi-delete" color="red" @click="test.targets.splice(index,1)")
    v-btn.ml-4(prepend-icon="mdi-plus" text="Voeg toe" @click="test.addTarget({})")
</template>

<script>
import MarkTexField from '@/components/helpers/MarkTexField.vue';


export default {
    name: 'LearningTargets',
    components: {
        MarkTexField
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
    },
};
</script>
