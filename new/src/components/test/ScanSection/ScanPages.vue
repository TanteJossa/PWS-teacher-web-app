<template lang="pug">
h2 Scan pages
div.d-flex.flex-row
    v-btn(text="Laad alle data" @click="test.scanStudentIdsAndSections()" :loading="test.loading.sections")

ImagesPreview(height="100%" :items="test.pages.map((page, index) => {return {page, index, id:page.id, image: page.image.url, is_loading: page.is_loading_all, title:(index+1).toString()}})" @delete="test.pages.splice(test.pages.findIndex(e => e.id == $event), 1)" :hasDeleteButton="true" v-model="selected_page_id_local")
    template(v-slot:selected="{ item }")
        //- v-progress-linear(v-if="test.loading.sections" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")

        v-btn(text="laad deze pagina" @click="async () => {this.test.loading.sections = true; await test.pages[item.index].detectStudentId(); await test.pages[item.index].loadSections();this.test.loading.sections = false}")
        v-btn(text="Create secties" @click="async () => {this.test.loading.sections = true; await test.pages[item.index].detectSquares(); await test.pages[item.index].createSections();this.test.loading.sections = false}")

        v-row.w-100
            v-col
                img(v-if="item.image" style="max-height: 100%; max-width: 100%" :src="item.image")
            v-col.w-50
                v-text-field(label="Leerlingnummer" v-model="test.pages[item.index].student_id")
                v-table
                    thead
                        tr
                            th Sectie
                            th Aangekruisde Vraag
                    tbody
                        tr(v-for="(section, section_index) in item.page.sections")
                            td {{ section_index + 1 }}
                            td

                                v-number-input(v-model="test.pages[item.index].sections[section_index].question_number" type="number" :min="0" controlVariant="stacked" density="compact" label="aangekruisde vraag")
</template>

<script>
import ImagesPreview from '@/components/helpers/ImagesPreview.vue';

export default {
    name: 'ScanPages',
    components: {
        ImagesPreview
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_page_id: {
            type: String,
            required: false
        }
    },
    emits: ['update:selected_page_id'],
    computed: {
        selected_page_id_local: {
            get() {
                return this.selected_page_id
            },
            set(val) {
                this.$emit('update:selected_page_id', val)
            }
        }
    }
};
</script>
