<template lang="pug">
component(:is="$vuetify.display.mdAndUp ? 'v-layout' : 'div'")

    NavigationDrawer(
        :test="test"
        :is_loading="is_loading"
        @save="$emit('save')"
    )
        SectionList(
            :selected_section_id="selected_section_id"
            :main_sections="main_sections"
            @update:selected_section_id="selected_section_id = $event"

        )


        template(v-slot:drawer2 v-if="selected_section.subsections.length > 0")
            SubsectionList(
                :selected_subsection_id="selected_section.selected_subsection_id"
                :subsections="selected_section.subsections"
                @update:selected_subsection_id="selected_section.selected_subsection_id = $event"
            )
        template(v-slot:extension)
            //- UserProfile(:user="user" @user-updated="$emit('setUser', $event)")
    v-main.h-100
        RequestDialog(
            :active_requests="active_requests"

        )
        
        div.h-100(v-if="selected_section_id == 'test'")
            TestSection.h-100(
                :selected_subsection="selected_subsection"
                :test="test"
                v-model:selected_test_source="selected_test_source"
                @update:selected_test_source="selected_test_source = $event"
            )

        div.h-100(v-if="selected_section_id == 'scan'")
            ScanSection.h-100(
                :selected_subsection="selected_subsection"
                v-model:selected_student_id="selected_student_id"
                :test="test"
                v-model:selected_page_id="selected_page_id"
                @update:selected_page_id="selected_page_id = $event"
                @load-student-pages="loadStudentPages"
            )

        div.h-100(v-if="selected_section_id == 'grade'")
            GradeSection.h-100(
                :selected_subsection="selected_subsection"
                v-model:selected_student_id="selected_student_id"
                :test="test"
            )

        div.h-100(v-if="selected_section_id == 'analyze'")
            AnalyzeSection.h-100(
                :selected_subsection="selected_subsection"
                :test="test"
                v-model:selected_student_id="selected_student_id"
                v-model:is_generating_pdf="is_generating_pdf"
                v-model:self_feedback_field="self_feedback_field"
                @update:selected_student_id="selected_student_id = $event"
                @update:is_generating_pdf="is_generating_pdf = $event"
                @update:self_feedback_field="self_feedback_field = $event"
                @download-student-results="downloadStudentResults"
                @download-selected-result="downloadSelectedResult"
            )

</template>

<script>
import {
    Test
} from '@/scan_api_classes';
import NavigationDrawer from '@/components/full_view/NavigationDrawer.vue';
import SectionList from '@/components/full_view/SectionList.vue';
import SubsectionList from '@/components/full_view/SubsectionList.vue';
import TestSection from '@/components/full_view/TestSection/TestSection.vue';
import ScanSection from '@/components/full_view/ScanSection/ScanSection.vue';
import GradeSection from '@/components/full_view/GradeSection/GradeSection.vue';
import AnalyzeSection from '@/components/full_view/AnalyzeSection/AnalyzeSection.vue';
import RequestDialog from '@/components/full_view/RequestDialog.vue';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton.vue'; // IMPORT GoogleLoginButton
import { initializeFileStructure, safelyLoadStudentFiles } from '@/file-fixes.js';

import {
    total_requests,
    rotateImage180,
    average,
    active_requests,
    apiRequest,
    downloadFileFromBase64,
    blobToBase64
} from '@/helpers';
import {
    imageToPngBase64
} from '@/helpers';
import test_example from '@/assets/test_example.pdf';
import rubric_example from '@/assets/rubric_example.pdf';
import toets_example from '@/assets/24-11-13_PWStoetsG3B.pdf'
import answer_print from '@/assets/answer_print.pdf'


export default {
    name: 'MainLayout',
    components: {
        NavigationDrawer,
        SectionList,
        SubsectionList,
        TestSection,
        ScanSection,
        GradeSection,
        AnalyzeSection,
        RequestDialog,
        GoogleLoginButton,

    },
    setup() {
        return {
            total_requests,
            rotateImage180,
            average,
            active_requests,
            apiRequest
        }
    },
    props: {
        test: {
            type: Object,
            default: new Test({})
        }
    },
    emits: [
        'save'
    ],
    data() {
        return {
            is_loading: false,
            currently_loading: "",
            main_sections: [
                {
                    name: 'Toets inladen',
                    id: 'test',
                    selected_subsection_id: 'structure',
                    subsections: [
                        {
                            name: "toets",
                            id: "test"
                        },
                        {
                            name: "rubric",
                            id: "rubric"
                        },
                        {
                            name: "ordenen",
                            id: "structure",
                            action: () => {
                                return this.selected_test_source == 'pdf' ? 'test_recognition' : 'test_generation'
                            }
                        },
                    ]
                },
                {
                    name: 'Inscannen',
                    id: 'scan',
                    selected_subsection_id: 'load_pages',
                    subsections: [
                        {
                            name: "Inladen",
                            id: "load_pages"
                        },
                        {
                            name: "Scannen",
                            id: "scan_pages"
                        },
                        {
                            name: "Leerlingen",
                            id: "generate_students",
                            action: () => {
                                return 'text_recognition'
                            }
                        },
                    ]
                },
                {
                    name: 'nakijken',
                    id: 'grade',
                    selected_subsection_id: 'grade_students',

                    subsections: [
                        // {
                        //     name: "Nakijken",
                        //     id: "grade_students",
                        //     action: () => {
                        //         return 'grading'
                        //     }

                        // }
                    ]
                },
                {
                    name: 'analyseer',
                    id: 'analyze',
                    selected_subsection_id: 'individual',

                    subsections: [
                        {
                            name: "Individueel",
                            id: "individual"
                        },
                        {
                            name: "Groep",
                            id: "group"
                        },

                    ]
                },
            ],
            selected_section_id: 'test',
            selected_page_id: '',
            selected_student_id: '',
            is_generating_pdf: false,
            self_feedback_field: false,
            selected_test_source: 'gpt',
            rerender_timer: true,

        }
    },
    emits: [],
    computed: {
        selected_section: {
            get() {
                return this.main_sections.find(e => e.id == this.selected_section_id)
            },
            set(val) {
                const index = this.main_sections.findIndex(e => e.id == val.id)

                if (index != -1) {
                    this.main_sections[index] = val
                }
            }
        },
        selected_student: {
            get() {
                return this.test.students.find(e => e.id == this.selected_student_id)
            },
            set(val) {
                const index = this.selected_student_index

                if (index != -1) {
                    this.test.students[index] = val
                }
            }
        },
        selected_student_index() {
            return this.test.students.findIndex(e => e.id == this.selected_student_id)
        },
        selected_subsection: {
            get() {
                return this.selected_section.subsections.find(e => e.id == this.selected_section.selected_subsection_id)
            },
            set(val) {
                const index = this.selected_section.subsections.findIndex(e => e.id == this.selected_section.selected_subsection_id)

                if (index != -1) {
                    this.selected_section.subsections[index] = val
                }
            }
        },
        action() {
            return this.selected_subsection?.action?.()

        },
        
    },
    methods: {

        log(s) {
            console.log(s)
        },
        async toDataURL(file) {
            console.log(file)
            return new Promise((resolve, reject) => {
                const reader = new FileReader();

                reader.onload = () => {
                    console.log("Loaded pdf file")
                    resolve(reader.result);
                };

                reader.onerror = () => {
                    reject(reader.error);
                };

                reader.readAsDataURL(file);
            });
        },
        base64ToBlob(base64String, contentType = '') {
            // Remove data URL prefix if it exists
            var base64Data = base64String.replace(/^data:([^;]+);base64,/, '');

            // Convert base64 to raw binary data
            var binaryData = atob(base64Data);

            // Create array buffer from binary data
            var arrayBuffer = new ArrayBuffer(binaryData.length);
            var uint8Array = new Uint8Array(arrayBuffer);

            // Fill array buffer with binary data
            for (let i = 0; i < binaryData.length; i++) {
                uint8Array[i] = binaryData.charCodeAt(i);
            }

            // Create blob from array buffer
            var blob = new Blob([arrayBuffer], {
                type: contentType
            });

            // Create and return blob URL
            return URL.createObjectURL(blob);
        },
        async loadBlob(filepath) {
            return new Promise((resolve, reject) => {
                // 1. Construct the full URL to the file within the site's directory.
                //    Assuming 'filepath' is relative to the current page or site's root.
                const fileUrl = new URL(filepath, window.location.href).href;

                // 2. Create a new XMLHttpRequest object to fetch the file.
                const xhr = new XMLHttpRequest();

                // 3. Configure the request:
                xhr.open('GET', fileUrl);
                xhr.responseType = 'blob'; // Tell the browser to expect a Blob as the response.

                // 4. Set up event listeners for successful load and errors.
                xhr.onload = function () {
                    if (xhr.status === 200) {
                        resolve(xhr.response); // Resolve the promise with the Blob object.
                    } else {
                        reject(new Error(`Failed to load file: ${xhr.status} - ${xhr.statusText}`));
                    }
                };

                xhr.onerror = function () {
                    reject(new Error("Network error occurred while fetching the file."));
                };

                // 5. Send the request.
                xhr.send();
            });
        },
        async loadStudentPages(event) {
            console.log(event)
            if (!event){
                return 
            }
            for (var i = 0; i < event.target.files.length; i++){

                var file = event.target.files[0]
                if (file.type.startsWith('image/')) {
                    const base64png = await imageToPngBase64(file)
                    if (base64png) {
                        if (this.test.files.students.data == null){
                            this.test.files.students.data = []
                        }
                        this.test.files.students.data.push(base64png)
                        this.test.addPage(base64png)
                    }
                }
                if (file.type.startsWith('application/pdf')) {
                    this.test.files.students = file


                }
            }
        },
        printTest() {
            console.log(this.test.students.map(student => {
                return {
                    student_id: student.student_id,
                    results: student.results.map(result => {
                        return {
                            question_number: result.question_number,
                            scan: {
                                base64Image: result.scan,
                                text: result.scan.text,
                                question_number: result.scan.question_number,
                            },
                            student_handwriting_percent: result.student_handwriting_percent
                        }
                    })
                }
            }))
        },
        async downloadStudentResults() {
            this.is_generating_pdf = true
            // wait for component updates
            console.log(this.test.student_pdf_data)
            await this.test.downloadStudentResults(this.self_feedback_field)
            this.is_generating_pdf = false

        },
        async downloadSelectedResult() {
            this.is_generating_pdf = true
            // wait for component updates
            if (this.selected_student) {
                console.log(this.selected_student)

                await this.selected_student.downloadStudentResult(this.self_feedback_field)
            }
            this.is_generating_pdf = false

        },
        getGradeColor(percent) {

            if (percent < 0.55) {
                return 'rgba(255,100,100,' + (-percent + 0.55) + ')'

            }

            return 'rgba(100,255,100,' + (percent - 0.55) + ')'
        },
        async downloadAnswerSheet() {
            const pdf_blob = await this.loadBlob(answer_print)
            const base64_pdf = await blobToBase64(pdf_blob)
            downloadFileFromBase64(base64_pdf, 'AnswerSheetToetsPWS')
        },

        async loadPreload() {
            this.is_loading = true

            this.currently_loading = 'Downloading pdfs'
            try {
                var [
                    test_blob,
                    rubric_blob,
                    student_blob,
                    preload_result
                ] = await Promise.all([
                    this.loadBlob(test_example),
                    this.loadBlob(rubric_example),
                    this.loadBlob(toets_example),
                    this.test.loadPreload(),
                ]);

                this.currently_loading = 'Starting blobs'
                // 


                this.currently_loading = 'test and rubric pdf data'
                this.test.files.test.raw = test_blob
                this.test.files.test.url = URL.createObjectURL(test_blob) //await this.toDataURL(test_blob)
                await this.test.loadDataFromPdf('test')
                this.test.files.rubric.raw = rubric_blob
                this.test.files.rubric.url = URL.createObjectURL(rubric_blob) //await this.toDataURL(rubric_blob)
                await this.test.loadDataFromPdf('rubric')
                // 

                this.currently_loading = 'structure'
                await this.test.loadTestStructure(true)

                // 
                this.currently_loading = 'student PDF'

                this.test.files.students.raw = student_blob
                this.test.files.students.url = URL.createObjectURL(student_blob) //await this.toDataURL(student_blob)

                this.currently_loading = 'data from pdf'
                await this.test.loadDataFromPdf('students')

                this.currently_loading = 'Create pages'

                this.test.createPages()
                // 

                this.currently_loading = 'Starting loading student and sections'
                await this.test.scanStudentIdsAndSections(true)

                this.test.loadStudents(true)
                // console.log(this.printTest())
                this.currently_loading = 'Starting grading students'
                await this.test.gradeStudents(true)
                console.log(this.test)
                this.is_loading = false
            } catch (e) {
                this.currently_loading = 'Inladen gefaalt'
                console.log(e)
                setTimeout(() => {
                    this.is_loading = false
                }, 2000);

            }
        },
        

    },
    watch: {

    },
    // created() {

    // },
    async mounted() {

        
        setInterval(() => {
            this.rerender_timer = !this.rerender_timer
        }, 100);




    },
}
</script>
<style>

</style>
