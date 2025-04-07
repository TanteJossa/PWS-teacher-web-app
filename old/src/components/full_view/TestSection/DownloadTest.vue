
<template lang="pug">
v-card.ma-2.pa-2
    h3 Download toets
    v-text-field(v-model="test.test_settings.name" label="naam")
    v-checkbox(v-model="test.test_settings.show_targets" label="Toon leerdoelen")
    v-checkbox(v-model="test.test_settings.show_answers" label="Toon antwoorden")
    v-select(v-model="test.test_settings.output_type" :items="['pdf', 'docx']" label="Output")
    p(style="color: red" v-if="test.test_settings.output_type == 'docx'") !Pas op! vragen worden door page-breaks gebroken
    v-btn(@click="test.downloadTest()" :loading="test.loading.test_pdf") Download Toets Pdf
</template>

<script>
export default {
    name: 'DownloadTest',
    props: {
        test: {
            type: Object,
            required: true
        }
    }
}
</script>
