
<template lang="pug">
v-row(style="height: 100vh")
    v-col
        h2 PDF {{ selected_subsection.name }}
        b 1 pdf tegelijk (inladen met knop), foto's laden automatisch
        div.d-flex.flex-row
            v-file-input(v-model="test.files.students.raw" accept="application/pdf  image/*" @update:modelValue="handleFileChange" multiple)
            v-btn(text="Laad toets" @click="test.loadDataFromPdf(selected_subsection.id)" :loading="test.loading.pdf_data")
        object.w-100(style="height: calc(100% - 40px)" :data="test.files.students.url" type="application/pdf" class="internal")
            embed(v-if="test.files.students.url" :src="test.files.students.url" type="application/pdf")
    v-col.h-100(style="overflow-y: scroll; position: relative")
        v-card.d-flex.flex-row(style="position: sticky; top: 0; z-index: 3")
            h2 Computerdata
        div.d-flex.flex-wrap
            div.pa-1(style="position: relative; width: 50%" v-for="(page, index) in test.pages")
                v-progress-linear(v-if="page.is_loading" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")
                div.d-flex.flex-row.flex-wrap
                    v-btn.mr-1(text="Crop" @click="test.pages[index].cropImage()")
                    v-btn.mr-1(text="Rode pen" @click="test.pages[index].colorCorrect()")

                    v-select(:items="page.image_options" v-model="test.pages[index].selected_image_type" density="compact")
                    v-icon.mr-1(icon="mdi-flip-vertical" @click="async () => {test.pages[index].image = await rotateImage180(test.pages[index].image)}")
                    v-icon.ml-auto(icon="mdi-delete" color="red" @click="test.files.students.data.splice(index,1)")

                img.w-100(:src="page.image")
</template>

<script>
import {
    rotateImage180
} from '@/helpers';
export default {
    name: 'LoadPages',
    props: {
        test: {
            type: Object,
            required: true
        },
        selected_subsection: { // Add this prop
            type: Object,
            required: true
        }
    },
    setup() {
        return {
            rotateImage180
        }
    },
    emits: ['load-student-pages'],
    methods: {
        handleFileChange(event) {
            this.$emit('load-student-pages', event) // Emit the event
        }
    }
};
</script>
