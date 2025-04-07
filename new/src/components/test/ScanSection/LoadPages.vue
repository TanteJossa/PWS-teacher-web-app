<template lang="pug">
v-row(style="height: 100%")
    v-col
        h2 PDF {{ selected_subsection.name }}
        b 1 pdf tegelijk (inladen met knop), foto's laden automatisch
        div.d-flex.flex-row
            v-file-input(
                v-model="studentFile"
                accept="application/pdf  image/*"
                @change="handleFileChange"
                multiple
                label="Student Pages PDF/Images" 
            )
            v-btn(
                text="Laad Pagina's" 
                @click="loadDataFromPdf"
                :loading="test.loading.pdf_data"
            )
        object.w-100( v-if="test.files.students.url" style="height: calc(100% - 150px)" :data="test.files.students.url" type="application/pdf" class="internal")
            embed(
                :src="test.files.students.url"
                type="application/pdf"
            )
    v-col.h-100(style="overflow-y: scroll; position: relative")
        v-card.d-flex.flex-row(style="position: sticky; top: 0; z-index: 3")
            h2 Computerdata
        div.d-flex.flex-wrap
            div.pa-1(style="position: relative; width: 50%" v-for="(page, index) in test.pages")
                v-progress-linear(v-if="page.is_loading" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")
                div.d-flex.flex-row.flex-wrap
                    v-btn.mr-1(text="Crop" @click="test.pages[index].cropImage()")
                    v-btn.mr-1(text="Rode pen" @click="test.pages[index].extractRedPen()")

                    v-select(:items="page.image_options" v-model="test.pages[index].selected_image_type" density="compact")
                    v-icon.mr-1(icon="mdi-flip-vertical" @click="test.pages[index].flipImage()")
                    v-icon.ml-auto(icon="mdi-delete" color="red" @click="test.pages.splice(index,1)")

                img.w-100(:src="page.image.url")
</template>

<script>
import {
    rotateImage180,
    imageToPngBase64
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
    data() {
        return {
            studentFile: null // NEW - local data property for file input
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
            this.studentFile = event // NEW - just update selectedFile
            this.loadStudentPages(event) // Keep emitting the event for page handling in MainLayout
        },
        async loadDataFromPdf() {
            // if (!this.studentFile) {
            //     console.warn("No file selected.");
            //     return;
            // }

            // this.test.student_pdf_raw = this.studentFile // NEW - Store raw file in Test object
            // console.log(this.studentFile)
            // this.test.files.students.localData = URL.createObjectURL(this.studentFile)
            
            // this.test.files.students.raw = await this.test.files.students.base64()
            
            await this.test.loadDataFromPdf("students");
            this.studentFile = null // NEW - clear selectedFile
        },
        async loadStudentPages(event) {
            console.log('student_pages:', event)
            if (!event) {
                return
            }
            for (var i = 0; i < event.target.files.length; i++) {

                var file = event.target.files[0]
                if (file.type.startsWith('image/')) {
                    const base64png = await imageToPngBase64(file)
                    if (base64png) {
                        if (this.test.files.students.data == null) {
                            this.test.files.students.data = []
                        }
                        this.test.files.students.data.push(base64png)
                        this.test.addPage(base64png)
                    }
                }
                if (file.type.startsWith('application/pdf')) {
                    this.test.files.students.raw = file
                    this.test.files.students.raw = await this.test.files.students.base64()

                }
            }
        },
    }
};
</script>
