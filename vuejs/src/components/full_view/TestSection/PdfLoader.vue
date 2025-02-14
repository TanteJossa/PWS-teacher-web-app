
<template lang="pug">
v-row.h-100()
    v-col( md="6" sm="12")
        h2 PDF {{ selected_subsection.name }}
        div.d-flex.flex-row
            v-file-input(
                v-model="test.files[selected_subsection.id].raw"
                accept="application/pdf"
                @update:modelValue="async ($event) => {test.files[selected_subsection.id].url = await toDataURL($event)}"
            )
            v-btn(
                text="Laad toets"
                @click="test.loadDataFromPdf(selected_subsection.id)"
                :loading="test.loading.pdf_data"
            )
        object.w-100(style="height: calc(100% )" :data="test.files[selected_subsection.id].url" type="application/pdf" class="internal")
            embed(
                v-if="test.files[selected_subsection.id].url"
                :src="test.files[selected_subsection.id].url"
                type="application/pdf"
            )
    v-col.h-100(style="overflow-y: scroll; position: relative" md="6" sm="12")
        v-card.d-flex.flex-row(style="position: sticky; top: 0; z-index: 3")
            h2 Computerdata
        PdfDataDisplay(:test="test" :selected_subsection="selected_subsection")
</template>

<script>
import PdfDataDisplay from '@/components/full_view/TestSection/PdfDataDisplay.vue';

export default {
    name: 'PdfLoader',
    components: {
        PdfDataDisplay
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true,
        },
    },
    methods: {
        async toDataURL(file) {
            return await this.$parent.$parent.toDataURL(file)
        }
    }
};
</script>
