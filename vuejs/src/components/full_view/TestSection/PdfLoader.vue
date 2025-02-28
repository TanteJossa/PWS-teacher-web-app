<template lang="pug">
v-row.h-100()
    v-col( md="6" sm="12")
        h2 PDF {{ selected_subsection.name }}
        div.d-flex.flex-row
            v-file-input(
                :model-value="test.files[selected_subsection.id]?.raw"
                accept="application/pdf"
                @update:model-value="handleFileChange"
            )
            v-btn(
                text="Laad toets"
                @click="loadDataFromPdf"
                :loading="test.loading.pdf_data"
            )
        object.w-100(v-if="test.files[selected_subsection.id].url" style="height: calc(100% )" :data="test.files[selected_subsection.id].url" type="application/pdf" class="internal")
            embed(
                
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
    data() {
        return {
            isUploading: false,
            isLoading: false,
        };
    },
    methods: {
        async handleFileChange(file) {
            if (!file) return;

            this.isUploading = true;
            try {
                this.test.files[this.selected_subsection.id].raw = file;
            } catch (error) {
                console.error('Error setting file:', error);
            } finally {
                this.isUploading = false;
            }
        },

        async loadDataFromPdf() {
            this.isLoading = true;
            try {
                await this.test.loadDataFromPdf(this.selected_subsection.id);
            } catch (error) {
                console.error('Error loading PDF data:', error);
            } finally {
                this.isLoading = false;
            }
        }
    }
};
</script>
