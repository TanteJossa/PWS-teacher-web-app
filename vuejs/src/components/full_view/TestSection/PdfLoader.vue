<template lang="pug">
v-row.h-100()
    v-col( md="6" sm="12")
        h2 PDF {{ selected_subsection.name }}
        div.d-flex.flex-row
            v-file-input(
                v-model="selectedFile"
                accept="application/pdf"
                @change="handleFileChange"
            )
            v-btn(
                text="Laad toets"
                @click="loadDataFromPdf"
                :loading="test.loading.pdf_data"
            )
        object.w-100(style="height: calc(100% )" :data="test.files[selected_subsection.url_key]" type="application/pdf" class="internal")
            embed(
                v-if="test.files[selected_subsection.url_key]"
                :src="test.files[selected_subsection.url_key]"
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
    data() {
        return {
            selectedFile: null, // Data property to hold selected file
        };
    },
    methods: {
        async loadDataFromPdf() {
            if (!this.selectedFile) { // Check if a file is selected
                console.warn("No file selected.");
                return;
            }
            // Update the raw file in the test object
            this.test.files[this.selected_subsection.id + 'PdfRaw'] = this.selectedFile; // Use .raw to store File object
            this.test.files[this.selected_subsection.id].raw = this.selectedFile; //OLD
            this.test.files[this.selected_subsection.url_key] = URL.createObjectURL(this.selectedFile) //NEW url key
            await this.test.loadDataFromPdf(this.selected_subsection.id);
            this.selectedFile = null; // Clear selectedFile after loading
        },
        async toDataURL(file) { // No longer used here, can be removed if not used elsewhere
            return await this.$parent.$parent.toDataURL(file)
        },
        handleFileChange(file) { // NEW - handle file input change
            this.selectedFile = file // just update selectedFile, loadDataFromPdf will handle the rest
        }
    },
};
</script>