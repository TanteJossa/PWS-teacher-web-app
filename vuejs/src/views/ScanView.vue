<template lang="pug">
div
    v-stepper(v-model='selected_step_index' alt-labels :mobile="!$vuetify.display.mdAndUp" style="height: 100vh")
        template.h-100(v-slot:default='{ prev, next }')
            v-stepper-header()
                template(
                    v-for='(step, index) in stepper_steps' 
                    :key='`${index}-step`'

                )
                    v-stepper-item(
                        :editable='true || index < selected_step_index'
                        :value="index"
                        :title="step"
                    ) 
                    v-divider(v-if='index !== stepper_steps.length-1')
            div.d-flex
                v-switch(v-model="is_qr_scanner" label="QR scanner") 

                v-btn(
                    @click="executeAll()"
                ) Execute all sequential
                v-btn(
                    @click="executeAllScanPage()"
                    :loading="all_loading_status=='started'"
                ) Execute all total (efficienter)
                v-btn(
                    :disabled="all_loading_status != 'loaded'"
                    @click="downloadJSON(pages.map(e => {return {page_id: e.id, result: e.total_result}}), 'all_page_data' )"
                    text="download all scanPage"
                )
            v-stepper-window.pa-0.ma-1(style="height: calc(100% - 190px); position: relative")
                v-stepper-window-item.pa-0.h-100(
                    v-for='(step, index) in stepper_steps' 
                    :key='`${index}-content`' 
                    :value='index'
                )
                    h2 {{ step, selected_page_id }}

                    div.h-100(v-if="step == 'load images'")
                        ImagesPreview(
                            :items="pages.map(page => {return {page, id:page.id, image: page.base64Image, title:page.id}})"
                            @delete="pages.splice(pages.findIndex(e => e.id == $event), 1)"
                            :hasDeleteButton="true"
                            v-model="selected_page_id"
                        )
                            template(v-slot:selected="{ item }")
                                v-row.w-100
                                    v-col
                                        img(
                                            v-if="item.image"
                                            style="max-height: 100%; max-width: 100%"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.image" 
                                        )
                                    v-col.w-50
                                        v-btn(
                                            :loading="item.page.is_loading_all"
                                            text="Extraheer alles" @click="item.page.scanPage()"
                                        )
                                        v-btn(
                                            :disabled="item.page.is_loading_all"
                                            text="Download"
                                            @click="downloadJSON(item.page.total_result, 'PageData_'+item.page.id)"
                                        )

                                        v-textarea(
                                            :rows="2"
                                            :auto-grow="false"
                                            v-model="question_string" title="question"
                                        )
                                        div.d-flex
                                            v-btn(text="load question JSON" @click="context_data.questions = JSON.parse(question_string)")
                                            p {{ Object.keys(context_data.questions) }}
                                        v-textarea(
                                            :rows="2"
                                            :auto-grow="false"
                                            v-model="rubric_string" title="rubric"
                                        )
                                        div.d-flex
                                            v-btn(text="load rubric JSON" @click="context_data.rubrics = JSON.parse(rubric_string)")
                                            p {{ Object.keys(context_data.rubrics) }}
                                        v-textarea(
                                            :rows="2"
                                            :auto-grow="false"
                                            v-model="context_string" title="context"
                                        )
                                        div.d-flex
                                            v-btn(text="load context JSON" @click="context_data.contexts = JSON.parse(context_string)")
                                            p {{ Object.keys(context_data.contexts) }}

                        v-file-input(
                            label="Upload images"
                            v-model="uploaded_images"
                            multiple
                            accept="image/*"
                        )
                        v-btn(@click="addUploadedImages") Add Images
                    div.h-100(v-if="step == 'crop images'")
                        ImagesPreview(
                            :items="pages.map(page => {return {page, id:page.id, image: page.base64Image, title:page.id}})"
                            height="100%"
                            style="overflow-y: scroll"

                            @delete="pages.splice(pages.findIndex(e => e.id == $event), 1)"
                            v-model="selected_page_id"
                        )
                            template(v-slot:selected="{ item }")
                                div.h-100.w-100.d-flex
                                    div.pa-3(style="height: 100%;")
                                        h2 Before
                                        img(
                                            style=" max-width: 100%; max-height: 100%"
                                            
                                            v-if="item.page.base64Image"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.page.base64Image"
                                        )

                                    v-divider(vertical)
                                    div.pa-3(style="height: 100%; max-width: 50%; position: relative")
                                        RequestLoader(v-if="item.page.is_loading")
                                        h2 after

                                        img(
                                            style=" max-width: 100%; max-height: 100%"
                                            
                                            v-if="item.page.croppedImage"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.page.croppedImage"
                                        )
                        v-btn(@click="cropImages") Crop Images
                    div.h-100(v-if="step == 'apply color correction'")
                        ImagesPreview(
                            :items="pages.map(page => {return {page, id:page.id, image: page.base64Image, title:page.id}})"
                            height="100%"
                            style="overflow-y: scroll"

                            @delete="pages.splice(pages.findIndex(e => e.id == $event), 1)"
                            v-model="selected_page_id"
                        )
                            template(v-slot:selected="{ item }")
                                div.h-100.w-100.d-flex
                                    div.pa-3(style="height: 100%; width: 50%")
                                        h2 Before
                                        img(
                                            style=" max-width: 100%; max-height: 100%"
                                            v-if="item.page.croppedImage"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.page.croppedImage"
                                        )

                                    v-divider(vertical)
                                    div.pa-3(style="height: 100%; width: 50%; position: relative")
                                        RequestLoader(v-if="item.page.is_loading")
                                        h2 after

                                        img(
                                            style=" max-width: 100%; max-height: 100%"
                                            v-if="item.page.colorCorrected"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.page.colorCorrected" 
                                        )
                        v-btn(@click="applyColorCorrection") Apply Color Correction
                    div.h-100(v-if="step == 'extract qr sections and student id'")
                        ImagesPreview(
                            :items="pages.map(page => {return {page, id:page.id, image: page.base64Image, title:page.id}})"
                            height="100%"
                            style="overflow-y: scroll"

                            @delete="pages.splice(pages.findIndex(e => e.id == $event), 1)"
                            v-model="selected_page_id"
                        )
                            template(v-slot:selected="{ item }")
                                h2 Student id
                                p {{ item.page.student_id  }}
                                v-divider
                                div.w-100.d-flex(style="height: calc(100% - 40px)")
                                    div.pa-3(style="height: 100%; width: 50%")
                                        h2 Before
                                        img(
                                            style=" max-width: 100%; max-height: 100%"
                                            v-if="item.page.colorCorrected"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.page.colorCorrected" 
                                        )

                                    v-divider(vertical)
                                    div.pa-3(style="height: 100%; width: 50%; position: relative")
                                        RequestLoader(v-if="item.page.is_loading")
                                        h2 after

                                        img(
                                            style=" max-width: 100%; max-height: 100%"
                                            v-if="item.page.squareImage"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.page.squareImage"
                                        )

                        v-btn(@click="extractQrSections") extract qr sections
                        v-btn(@click="extractStudentId") extract student id

                    div.h-100(v-if="step == 'detect squares'")
                        //- p {{ }}
                        ImagesPreview(
                            :items="pages.map(page => {return {page, id:page.id, image: page.base64Image, title:page.id}})"
                            height="100%"
                            style="overflow-y: scroll"

                            @delete="pages.splice(pages.findIndex(e => e.id == $event), 1)"
                            v-model="selected_page_id"
                        )
                            template(v-slot:selected="{ item }")
                                h2 Student id
                                p {{ item.page.student_id  }}
                                v-divider
                                div.w-100.d-flex(style="height: calc(100% - 40px)")
                                    div.pa-3(style="height: 100%; width: 50%")
                                        h2 Before
                                        img(
                                            style=" max-width: 100%; max-height: 100%"
                                            v-if="item.page.colorCorrected"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.page.colorCorrected" 
                                        )

                                    v-divider(vertical)
                                    div.pa-3(style="height: 100%; width: 50%; position: relative")
                                        RequestLoader(v-if="item.page.is_loading")
                                        h2 after

                                        img(
                                            style=" max-width: 100%; max-height: 100%"
                                            v-if="item.page.squareImage"
                                            v-fullscreen-img="{scaleOnHover: true}"
                                            :src="item.page.squareImage"
                                        )
                        v-btn(@click="detectSquares") Detect Squares
                        v-btn(@click="extractStudentId") extract student id

                    div.h-100(v-if="step == 'extract sections'")
                        ImagesPreview(
                            :items="pages.map(page => {return {page, id:page.id, image: page.base64Image, title:page.id}})"
                            height="100%"
                            style="overflow-y: scroll"

                            @delete="pages.splice(pages.findIndex(e => e.id == $event), 1)"
                            v-model="selected_page_id"
                        )
                            template(v-slot:selected="{ item }")
                                ImagesPreview(
                                    :items="item.page.sections.map(section => {return {section, id: section.id, image: section.full, title: section.id}})"
                                )
                                    template(v-slot:selected="{ item }")
                                        div.w-100.h-100.pa-3(style="overflow-y: scroll")
                                            div(v-if="item.section.full")
                                                h2 full
                                                img(
                                                    :src="item.section.full"
                                                    v-fullscreen-img="{scaleOnHover: true}"
                                                    style="max-height: 200px; max-width: 90%"
                                                )
                                                v-divider
                                            div(v-if="item.section.section_finder")
                                                h2 section_finder and studet id
                                                img(
                                                    :src="item.section.section_finder"
                                                    v-fullscreen-img="{scaleOnHover: true}"
                                                    style="max-height: 200px; max-width: 90%"

                                                )
                                                v-divider

                                            div(v-if="item.section.question_selector")
                                                h2 question_selector
                                                img(
                                                    :src="item.section.question_selector"
                                                    v-fullscreen-img="{scaleOnHover: true}"
                                                    style="max-height: 200px; max-width: 90%"
                                                )
                                                v-divider
                                            div(v-if="item.section.answer")
                                                h2 answer
                                                img(
                                                    :src="item.section.answer"
                                                    v-fullscreen-img="{scaleOnHover: true}"
                                                    style="max-height: 200px; max-width: 90%"

                                                )
                                                v-divider
                                            div(style="position: relative")
                                                RequestLoader(v-if="item.section.is_loading")

                                                h2 question number
                                                p {{ item.section.question_number }}
                                                v-divider
                                                h2 question data
                                                pre {{ item.section.question_number_data }}
                                                
                        //- ImagesPreview(
                        //-     :images="pages.map(page => page.sections.map(section => section.base64Image))"
                        //-     height="100%"
                            style="overflow-y: scroll"

                        //- )
                        v-btn(@click="extractQuestions") Extract question numbers
                    div.h-100(v-if="step == 'link answers'")
                        ImagesPreview(
                            :items="pages.map(page => {return {page, id:page.id, image: page.base64Image, title:page.id}})"
                            height="100%"
                            style="overflow-y: scroll"

                            @delete="pages.splice(pages.findIndex(e => e.id == $event), 1)"
                            v-model="selected_page_id"
                        )
                            template(v-slot:selected="{ item }")

                                ImagesPreview(
                                    :items="item.page.questions.map(question => {return {question, id: question.id, image: question.full, title: question.id}})"
                                )
                                    template(v-slot:selected="{ item }")
                                        div.w-100.h-100.pa-3(style="overflow-y: scroll")
                                            h2 question_number
                                            p {{ item.question.question_number}}

                                            v-divider    
                                            h2 full
                                            img(
                                                :src="item.question.base64Image"
                                                v-fullscreen-img="{scaleOnHover: true}"
                                                max-height="200px"
                                            )
                                            v-divider
                                            div(style="position: relative")
                                                RequestLoader(v-if="item.question.is_loading")

                                                h2 text
                                                pre {{ item.question.text }}
                                                v-divider
                                                h2 download individual
                                                v-btn(@click="downloadJSON(item.question.data, 'individual_question_'+item.question.id)") download
                                                v-btn(@click="downloadJSON({data:item.question.data, image: item.question.base64Image}, 'individual_question_with_image_'+item.question.id)") download with image
                                                v-divider
                                                h2 data
                                                pre {{ item.question.data }}
                                                
                        v-btn(@click="linkAnswers") link answers
                        v-btn(@click="extractText") extract text
                        v-btn(@click="downloadJSON(this.pages.map(page => {return {id: page.id, questions: page.questions.map(question => {return {data:question.data}})}}), 'page_data')") download 
                        v-btn(@click="downloadJSON(this.pages.map(page => {return {id: page.id, questions: page.questions.map(question => {return {data:question.data, image: question.base64Image}})}}), 'page_data_with_image')") download with image
            div.d-flex.w-100(style="position: absolute; bottom: 0px")
                v-btn(@click="prev") prev
                v-btn.ml-auto(@click="next") next

</template>

<script>
// Data 
import { getRandomID, downloadJSON } from '@/helpers'
import { ScanPage, ContextData } from '@/scan_api_classes.js' // Adjust the path as needed



// Components
import ImagesPreview from '@/components/image/ImagesPreview.vue'
import RequestLoader from '@/components/sub/RequestLoader.vue'

// Assets
import HAL from '@/assets/HAL.png'
import lege_student_row from '@/assets/lege_student_row.png'
import INPUT from '@/assets/input.png'
import TESTFOTO from '@/assets/crop_input.png'
import QRSECTION from '@/assets/qr_section_input.png'

export default {
    name: 'ScanView',
    components: {
        ImagesPreview,
        RequestLoader
    },
    setup(props) {
        return { downloadJSON }  
    },
    data() {
        return {
            selected_page_id:null,
            selected_step_index: 0,
            uploaded_images: [],
            pages: [], // Stores Page objects
            is_qr_scanner: false,
            all_loading_status: 'idle',

            context_data: new ContextData({}),

            question_string: "",
            rubric_string: "",
            context_string: "",

        }
    },
    computed: {
        selected_step() { return this.stepper_steps[this.selected_step_index] },
        stepper_steps(){
            if(this.is_qr_scanner){
                return [
                    'load images',
                    'crop images',
                    'apply color correction',
                    'extract qr sections and student id',
                    'extract sections',
                    'link answers',
                ]
            }
            return [
                'load images',
                'crop images',
                'apply color correction',
                'detect squares',
                'extract sections',
                'link answers',
            ]
        }
    },
    methods: {
        async convertImageToPNG(file) {
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader()
                reader.onload = () => resolve(reader.result)
                reader.onerror = reject
                reader.readAsDataURL(file)
            })
            return dataUrl.split(',')[1] // Remove "data:image/png;base64," prefix
        },
        async convertImportedImageToBase64(imageSrc) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous'; // This is needed if the image is hosted externally
                img.src = imageSrc instanceof File ? URL.createObjectURL(imageSrc) : imageSrc

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/png')); // Get the Base64 string
                };

                img.onerror = (error) => {
                    console.error("Error loading image:", error, "Source:", imageSrc);
                    reject(new Error("Failed to load image at " + imageSrc));
                };
            });
        },
        
        async addUploadedImages() {
            
            
            const pngImages = await Promise.all(
                this.uploaded_images.map(e => {
                    if (e.type == "application/pdf") {
                        return pdfToPng(e)
                    }
                    return this.convertImportedImageToBase64(e)
                })
            )
            pngImages.forEach(image => this.addImage(image))
        },

        addImage(base64Image) {
            const page = new ScanPage(base64Image, this.context_data)
            this.pages.push(page)
        },

        async cropImages() {
            await Promise.all(this.pages.map(page => page.cropImage()))
        },

        async applyColorCorrection() {
            await Promise.all(this.pages.map(page => page.colorCorrect()))
        },
        async extractQrSections(){
            await Promise.all(this.pages.map(async page => await page.detectQrSections()))
        },
        async extractStudentId(){
            await Promise.all(this.pages.map(async page => await page.detectStudentId()))
        },
        async detectSquares() {
            await Promise.all(this.pages.map(async page => {
                await page.detectSquares()
                await page.createSections()
            }))
            console.log(this.pages)
        },

        async extractSections() {
            await Promise.all(this.pages.map(page => page.createSections()))
        },
        async extractQuestions(){
            await Promise.all(this.pages.map(page => page.extractQuestions()))

        },
        async linkAnswers() {
            await Promise.all(this.pages.map(page => page.linkAnswers()))
        },
        async extractText() {
            await Promise.all(this.pages.map(page => page.extractText()))
        },
        async executeAllScanPage() {
            this.all_loading_status = 'started'
            await Promise.all(this.pages.map(page => page.scanPage()))
            this.all_loading_status = 'loaded'
        },
        async executeAll(){
            await Promise.all(this.pages.map(async page => {
                await page.cropImage()
                await page.colorCorrect()
                await Promise.all([page.detectStudentId(), page.detectSquares()])
                await page.createSections()
                await page.extractQuestions()
                await page.linkAnswers()
                await page.extractText()
            }))
        },
        next() {
            const actions = {
                'crop images': this.cropImages,
                'apply color correction': this.applyColorCorrection,
                'detect squares': this.detectSquares,
                'extract sections': this.extractSections,
                'link answers': this.linkAnswers
            }
            const action = actions[this.selected_step]
            if (action) action()
            this.selected_step_index++
        },

        prev() {
            this.selected_step_index--
        }
    },
    watch:{
        async is_qr_scanner(){
            if (this.is_qr_scanner){
                this.addImage(await this.convertImportedImageToBase64(QRSECTION))

            }
        }
    },
    async mounted() {
        // Load initial images as pages
        // this.addImage(HAL)
        // console.log(await this.convertImportedImageToBase64(INPUT))
        this.addImage(await this.convertImportedImageToBase64(TESTFOTO))
        console.log(this.pages)
    },
}
</script>
    
<style scoped>
/* Add any styling here */
.fill-height-image {
  display: flex;
  flex-flow: column;
  height: 100%;

  flex: 1 1 auto;
}
</style>
