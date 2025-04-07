<template lang="pug">
v-container
    v-card
        v-card-text
            div.d-flex.flex-row.flex-wrap
                RequestDialog(
                    :active_requests="active_requests"
                    :finished_requests="finished_requests"
                )
                v-select(
                    :items='Object.keys(test.provider_models)'
                    v-model="test.gpt_provider"
                    @update:modelValue="test.gpt_model = test.gpt_models('grading')?.[0]?.value"
                )
                v-select(
                    :items="test.gpt_models('grading')"
                    v-model="test.gpt_model"
                    mandatory
                )
            v-tabs(v-model="selected_tab")
                v-tab(value="scan") Scan
                v-tab(value="grade") Nakijken

            v-tabs-window(v-model="selected_tab")
                v-tabs-window-item(
                    value="scan"
                )
                    .d-flex.flex-row
                        v-file-input(
                            v-model="selected_file"
                            accept="image/*"
                            @change="handleFileChange"
                            multiple
                            label="Foto van toetsblaadje" 
                        )
                    v-divider
                    div(v-if="page")
                        div
                            v-progress-linear(v-if="page.is_loading" indeterminate)
                            v-row
                                v-col
                                    div.d-flex.flex-row.flex-wrap
                                        v-btn.mr-1(
                                            text="Crop" 
                                            @click="page.cropImage()" 
                                            :disabled="page.is_loading"
                                        )
                                        v-btn.mr-1(
                                            text="Rode pen" 
                                            @click="page.extractRedPen()" 
                                            :disabled="page.is_loading"
                                        )

                                        v-select(
                                            :items="page.image_options" 
                                            v-model="page.selected_image_type" 
                                            density="compact" 
                                            :disabled="page.is_loading"
                                        )
                                        v-icon.mr-1(icon="mdi-flip-vertical" @click="page.flipImage()" :disabled="page.is_loading")
                                    v-btn(
                                        @click="loadPageData()"
                                        :disabled="page.is_loading"
                                    ) Load sections
                                    v-img(
                                        :src="page.image.url"
                                    )
                                v-col
                            
                                    v-img(
                                        v-if="page.square_data_image_raw"
                                        :src="page.square_data_image_raw"
                                    )
                            v-expansion-panels
                                v-expansion-panel 
                                    v-expansion-panel-title Secties
                                    v-expansion-panel-text
                                        v-row
                                            v-col
                                                div(v-for="section in page.sections")
                                                    v-row
                                                        v-col(style="min-width: 250px")
                                                            v-select(
                                                                :items="Object.keys(section.images)"
                                                                v-model="selected_section_image[section.id]"
                                                                density="compact"
                                                            )
                                                        v-col
                                                            v-img(
                                                                :src="section.images[selected_section_image[section.id]]?.url"
                                                            )
                                                    v-divider
                                            v-col
                                                v-text-field(label="Leerlingnummer" v-model="page.student_id")
                                                v-table
                                                    thead
                                                        tr
                                                            th Sectie
                                                            th Aangekruisde Vraag
                                                    tbody
                                                        tr(v-for="(section, section_index) in page.sections")
                                                            td {{ section_index + 1 }}
                                                            td

                                                                v-number-input(v-model="page.sections[section_index].question_number" type="number" :min="0" controlVariant="stacked" density="compact" label="aangekruisde vraag")
                                v-expansion-panel 
                                    v-expansion-panel-title Questions
                                    v-expansion-panel-text
                                        v-table
                                            thead
                                                tr
                                                    th #
                                                    th Antwoord
                                                    th Text
                                            tbody
                                                tr(v-for="question in page.questions")
                                                    td {{ question.question_number }}
                                                    td 
                                                        v-img(
                                                            :src="question.image.url"
                                                        )
                                                    td {{ question.text }}




                v-tabs-window-item(
                    value="grade"
                )
                    QuestionEditor(
                        v-model="test.questions[0]"
                        :test="test"
                        :index="0"
                        hideOrderButtons
                        hideTargetPointSelection
                    
                    )
                    v-divider.mt-2
                    v-textarea(
                        v-if="student_result?.scan"
                        label="antwoord"
                        v-model="student_result.scan.text"
                    )
                    v-btn(
                        :loading="is_grading"
                        @click="gradeAnswer()"
                    ) Kijk na
                    v-divider.mt-2
                    GradeRubricResult(
                        v-model="student_result"
                    )


</template>

<script>
// Data 
import {
    ScanPage,
    Test,
    StudentQuestionResult
} from '@/classes'
import answer_page_example from '@/assets/answer_page_example.png'
import {
    fetchFileAsBlob,
    imageToPngBase64,
    blobToBase64,
    apiRequest,
    active_requests,
    finished_requests,
} from '@/helpers'

// Components 
import RequestDialog from '@/components/test/menu/RequestDialog.vue'
import QuestionEditor from '@/components/test/TestSection/QuestionEditor.vue'
import GradeRubricResult from '@/components/test/GradeSection/GradeRubricResult.vue'

export default {
    name: 'DemoView',
    components: {
        RequestDialog,
        QuestionEditor,
        GradeRubricResult
    },
    props: {
    
    },
    emits: [],
    setup() {
        return {
            active_requests,
            finished_requests
        }
    },
    data(){
        return {
            selected_tab: 'scan',
            selected_file: null,
            page: null,
            test: new Test({
                questions: [{
                    question_number: "1",
                    question_text: "",
                    question_context: "",
                    answer_text: "",
                    is_draw_question: false,
                    points: [
                        {
                            point_text: "",
                            point_name: "",
                            point_weight: 1
                        }
                    ]
                }]
            }),
            selected_section_image: {

            },
            student_result: null,
            is_grading: false,
        }
    },
    computed: {
    
    },
    methods: {
        async handleFileChange(event){
            if (!event) {
                return
            }
            for (var i = 0; i < event.target.files.length; i++) {
                let base64png = null
                var file = event.target.files[0]
                if (typeof file == 'string'){
                    base64png = file
                }else if (file.type.startsWith('image/')) {
                    base64png = await imageToPngBase64(file)

                }
                if (base64png) {
                    this.page = new ScanPage({
                        images: {
                            original: {
                                raw: base64png
                            }
                        }
                    })
                }
            }
        },
        async loadPageData(){
            this.page.loading.all = true
            try {

                const response = await apiRequest('/scan_page',{
                    Base64Image: this.page.image.raw,
                    provider: this.test.gpt_provider,
                    model: this.test.gpt_model
                })
                console.log(response)
                if (!response.success){
                    throw Error('API error') 
                }
                this.page.student_id = response.student_id_data?.result?.text || ''
                this.page.square_data_image_raw = response.square_image || null

                response.sections.forEach(section => {
                    const images_data = {}
                    const image_types = ['full', 'section_finder', 'question_selector', 'answer']
                    image_types.forEach(key => {
                        images_data[key] = {
                            raw: section.images?.[key] || '',
                            file_type: 'png',
                        };
                    });

                    this.page.addSection({
                        question_number: section.question_id,
                        images: images_data
                    })
                    this.page.sections.forEach(section => {
                        this.selected_section_image[section.id] = 'full'
                    });
                });

                response.questions.forEach(question => {
                    this.page.addQuestion({
                        student_id: this.page.student_id, //optional
                        question_number: question.question_id,
                        image: {
                            file_type: 'png',
                            raw: question.image
                        },
                        text: question.text_result?.result?.correctly_spelled_text || ''
                    })
                })
                console.log(this.page)
            } catch (error) {
                console.log(error)
            } finally {
                this.page.loading.all = false

            }

        },
        async gradeAnswer(){
            this.is_grading = true
            try {
                await this.student_result.grade()
            } catch (error) {
                console.log(error)
                
            } finally {
                this.is_grading = false
            }
        }

    },
    watch: {
    
    },
    // created() {
    
    // },
    async mounted() {
        this.handleFileChange({
            target: {
                files: [await blobToBase64(await fetchFileAsBlob(answer_page_example))]
            }
        })
        this.student_result = new StudentQuestionResult({
            student: {test: this.test},
            question_id: this.test.questions[0].id,
            scan: {}
        })
    },
    
    
}
</script>
    
<style scoped>
    
</style>
