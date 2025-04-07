import os

def create_vue_component(filepath, component_name, content):
    """Creates a Vue component file with the provided content."""
    with open(filepath, 'w', encoding='utf-8') as f:  # Use UTF-8 encoding
        f.write(content)

def main():
    """Creates the directory structure and Vue component files."""

    base_dir = os.path.join(".", "src", "components", "full_view")

    # Create directories
    os.makedirs(base_dir, exist_ok=True)
    os.makedirs(os.path.join(base_dir, "TestSection"), exist_ok=True)
    os.makedirs(os.path.join(base_dir, "ScanSection"), exist_ok=True)
    os.makedirs(os.path.join(base_dir, "GradeSection"), exist_ok=True)
    os.makedirs(os.path.join(base_dir, "AnalyzeSection"), exist_ok=True)

    # Component data (name, filepath, content)
    components = {
        "MainLayout": {
            "filepath": os.path.join(base_dir, "MainLayout.vue"),
            "content": """
<template lang="pug">
div(style="position: relative; height: 100vh")
    v-progress-linear(v-if="is_loading" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")

    NavigationDrawer
        SectionList(
            :selected_section_id="selected_section_id"
            :main_sections="main_sections"
            @update:selected_section_id="selected_section_id = $event"
        )
        template(v-slot:drawer2)
            SubsectionList(
                :selected_subsection_id="selected_section.selected_subsection_id"
                :subsections="selected_section.subsections"
                @update:selected_subsection_id="selected_section.selected_subsection_id = $event"
            )
            
    RequestDialog(
        :active_requests="active_requests"

    )
    
    div.h-100(v-if="selected_section_id == 'test'")
        TestSection(
            :selected_subsection="selected_subsection"
            :test="test"
            :selected_test_source="selected_test_source"
            @update:selected_test_source="selected_test_source = $event"
        )

    div.h-100(v-if="selected_section_id == 'scan'")
        ScanSection(
            :selected_subsection="selected_subsection"
            :test="test"
            :selected_page_id="selected_page_id"
            @update:selected_page_id="selected_page_id = $event"
            @load-student-pages="loadStudentPages"
        )

    div.h-100(v-if="selected_section_id == 'grade'")
        GradeSection(
            :selected_subsection="selected_subsection"
            :test="test"
        )

    div.h-100(v-if="selected_section_id == 'analyze'")
        AnalyzeSection(
            :selected_subsection="selected_subsection"
            :test="test"
            :selected_student_id="selected_student_id"
            :is_generating_pdf="is_generating_pdf"
            :self_feedback_field="self_feedback_field"
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
        RequestDialog
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
                        {
                            name: "Nakijken",
                            id: "grade_students",
                            action: () => {
                                return 'grading'
                            }

                        }
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
            test: new Test({}),
            selected_page_id: '',
            selected_student_id: '',
            is_generating_pdf: false,
            self_feedback_field: false,
            selected_test_source: 'gpt',
            rerender_timer: true

        }
    },
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

        }
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
            event.forEach(async file => {
                if (file.type.startsWith('image/')) {
                    const base64png = await imageToPngBase64(file)
                    if (base64png) {
                        this.test.files.students.data.push(base64png)
                        this.test.addPage(base64png)
                    }
                }
                if (file.type.startsWith('application/pdf')) {
                    this.test.files.students.raw = file
                    this.test.files.students.url = URL.createObjectURL(file)

                }
            })
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
        }

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
""",
        },
        "NavigationDrawer": {
            "filepath": os.path.join(base_dir, "NavigationDrawer.vue"),
            "content": """
<template lang="pug">
v-navigation-drawer(
    permanent
    nav
    width="160"
)   
    v-list
        v-btn(
            text="Laad preload (200MB)"
            @click="loadPreload()"
            :loading="test.loading.preload"
        )
        v-btn.mt-1(
            text="Download Antwoordpagina"
            @click="downloadAnswerSheet()"
        )
        v-btn.mt-1.w-100(
            text="Bekijk PWS"
            href="/pdf"
        )
        p Aantal modellen: {{ test.total_model_count }}
        v-select(
            :items='["google", "openai", "deepseek", "alibaba"]'
            v-model="test.gpt_provider"
            @update:modelValue="test.gpt_model = test.gpt_models(action)?.[0]?.value"
        )
        v-select(
            :items="test.gpt_models(action)"
            v-model="test.gpt_model"
            mandatory
        )
    slot
    v-navigation-drawer(
        permanent
        nav
        width="160"
        v-if="selected_section_id != 'analyze'"
    )
        v-list
            slot(name="drawer2")
</template>

<script>
export default {
    name: 'NavigationDrawer',
    props: {
        test: {
            type: Object,
            required: true
        },
        action: {
            type: String,
            required: false
        },
        selected_section_id: {
            type: String,
            required: false
        }
    },
    methods: {
        async loadPreload() {
            await this.$parent.loadPreload()
        },
        async downloadAnswerSheet() {
            await this.$parent.downloadAnswerSheet()

        }
    }
};
</script>
""",
        },
        "SectionList": {
            "filepath": os.path.join(base_dir, "SectionList.vue"),
            "content": """
<template lang="pug">
v-list(
    :selected="[selected_section_id]"
    mandatory
)
    v-list-item Onderdelen
    v-divider
    v-list-item(
        v-for="section in main_sections"
        :key="section.id"
        :value="section.id"
        @click="$emit('update:selected_section_id', section.id)"
    ) {{ section.name }}
</template>

<script>
export default {
    name: 'SectionList',
    props: {
        main_sections: {
            type: Array,
            required: true,
        },
        selected_section_id: {
            type: String,
            required: true,
        },
    },
    emits: ['update:selected_section_id'],
};
</script>
""",
        },
        "SubsectionList": {
            "filepath": os.path.join(base_dir, "SubsectionList.vue"),
            "content": """
<template lang="pug">
v-list(
    :selected="[selected_subsection_id]"
    mandatory
)
    v-list-item(
        v-for="(section, index) in subsections"
        :key="section.id"
        :value="section.id"
        @click="$emit('update:selected_subsection_id', section.id)"
        nav
    ) {{ section.name }}
</template>

<script>
export default {
    name: 'SubsectionList',
    props: {
        subsections: {
            type: Array,
            required: true,
        },
        selected_subsection_id: {
            type: String,
            required: true,
        },
    },
    emits: ['update:selected_subsection_id'],
};
</script>
""",
        },
        "TestSection": {
            "filepath": os.path.join(base_dir, "TestSection", "TestSection.vue"),
            "content": """
<template lang="pug">
div.h-100
    PdfLoader(
        v-if="selected_subsection.id == 'test' || selected_subsection.id == 'rubric'"
        :test="test"
        :selected_subsection="selected_subsection"
    )

    TestStructure(
        v-if="selected_subsection.id == 'structure'"
        :test="test"
        :selected_test_source="selected_test_source"
        @update:selected_test_source="$emit('update:selected_test_source', $event)"
    )
</template>

<script>
import PdfLoader from '@/components/full_view/TestSection/PdfLoader.vue';
import TestStructure from '@/components/full_view/TestSection/TestStructure.vue';

export default {
    name: 'TestSection',
    components: {
        PdfLoader,
        TestStructure,
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true
        },
        selected_test_source: {
            type: String,
            required: true
        }
    },
    emits: ['update:selected_test_source'],
};
</script>
""",
        },
        "PdfLoader": {
            "filepath": os.path.join(base_dir, "TestSection", "PdfLoader.vue"),
            "content": """
<template lang="pug">
v-row(style="height: 100vh")
    v-col
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
        object.w-100(style="height: calc(100% - 40px)" :data="test.files[selected_subsection.id].url" type="application/pdf" class="internal")
            embed(
                v-if="test.files[selected_subsection.id].url"
                :src="test.files[selected_subsection.id].url"
                type="application/pdf"
            )
    v-col.h-100(style="overflow-y: scroll; position: relative")
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
""",
        },
        "PdfDataDisplay": {
            "filepath": os.path.join(base_dir, "TestSection", "PdfDataDisplay.vue"),
            "content": """
<template lang="pug">
div(v-for="(item,index) in  test.files[selected_subsection.id].data")
    v-expansion-panels
        v-expansion-panel
            v-expansion-panel-title {{ item.type }}
            v-expansion-panel-text
                div(v-if="item.type == 'text'")
                    v-textarea(v-model="test.files[selected_subsection.id].data[index].data")
                div(v-if="item.type == 'image'")
                    img(style="height: 300px" :src="item.data")
</template>

<script>
export default {
    name: 'PdfDataDisplay',
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true
        }
    },
};
</script>
""",
        },
        "TestStructure": {
            "filepath": os.path.join(base_dir, "TestSection", "TestStructure.vue"),
            "content": """
<template lang="pug">
div.h-100.w-100(style="overflow-y: scroll; position: relative; ")
    v-progress-linear(v-if="test.loading.structure" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")
    v-card()
        v-tabs(v-model="selected_test_source_local")
            v-tab(value="gpt") AI
            v-tab(value="pdf") PDF's
        v-card-text
            v-tabs-window(v-model="selected_test_source_local")
                v-tabs-window-item.w-100(value="gpt")
                    v-radio-group(v-model="test.gpt_test.school_type" inline)
                        v-radio(value="basisschool" label="basisschool")
                        v-radio(value="vmbo" label="vmbo")
                        v-radio(value="havo" label="havo")
                        v-radio(value="vwo" label="vwo")
                        v-radio(value="mbo" label="mbo")
                        v-radio(value="hbo" label="hbo")
                        v-radio(value="universiteit" label="universiteit")

                    v-number-input(type="number" v-model="test.gpt_test.school_year")
                    v-text-field(label="Vak" v-model="test.gpt_test.school_subject")
                    v-text-field(label="Onderwerp" v-model="test.gpt_test.subject")
                    v-textarea(label="geleerde stof (optioneel)" auto-grow :rows="2" v-model="test.gpt_test.learned")
                    v-textarea(label="Onderwerpen die voor moeten komen" hint="Scheiden met komma's" auto-grow :rows="2" v-model="test.gpt_test.requested_topics")
                    v-btn.mt-2(@click="test.generateGptTest()") Genereer vragen

                v-tabs-window-item(value="pdf")
                    v-btn(text="Laad structuur met gpt request uit pdfs" @click="test.loadTestStructure()" :loading="test.loading.structure")

    LearningTargets(:test="test")
    QuestionsEditor(:test="test")
    DownloadTest(:test="test")
</template>

<script>
import LearningTargets from '@/components/full_view/TestSection/LearningTargets.vue';
import QuestionsEditor from '@/components/full_view/TestSection/QuestionsEditor.vue';
import GenerateQuestion from '@/components/full_view/TestSection/GenerateQuestion.vue';
import DownloadTest from '@/components/full_view/TestSection/DownloadTest.vue';

export default {
    name: 'TestStructure',
    components: {
        LearningTargets,
        QuestionsEditor,
        GenerateQuestion,
        DownloadTest
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_test_source: {
            type: String,
            required: true
        }
    },
    emits: ['update:selected_test_source'],

    computed: {
        selected_test_source_local: {
            get() {
                return this.selected_test_source
            },
            set(val) {
                this.$emit('update:selected_test_source', val)
            }
        }
    }
};
</script>
""",
        },
        "LearningTargets": {
            "filepath": os.path.join(base_dir, "TestSection", "LearningTargets.vue"),
            "content": """
<template lang="pug">
div
    h2 Leerdoelen
    v-table(density="compact")
        thead
            tr
                th Naam
                th Uitleg
                th(width="55px")
        tbody
            tr(v-for="(target, index) in test.targets")
                td.pa-0
                    v-textarea(v-model="test.targets[index].target_name" density="compact" auto-grow :rows="1")
                td.pa-0
                    v-textarea(v-model="test.targets[index].explanation" auto-grow :rows="1" density="compact")
                td.pa-0
                    v-icon(icon="mdi-delete" color="red" @click="test.targets.splice(index,1)")
    v-btn(prepend-icon="mdi-plus" text="Voeg toe" @click="test.addTarget({})")
</template>

<script>
export default {
    name: 'LearningTargets',
    props: {
        test: {
            type: Object,
            required: true,
        },
    },
};
</script>
""",
        },
        "QuestionsEditor": {
            "filepath": os.path.join(base_dir, "TestSection", "QuestionsEditor.vue"),
            "content": """
<template lang="pug">
div
    h2 Vragen
    div
        transition-group
            v-card.ma-2(v-for="(question, index) in test.questions" :key="question.id")
                v-card-text
                    QuestionEditor(:question="question" :index="index" :test="test")
        v-btn.ml-4(prepend-icon="mdi-plus" text="Voeg eigen vraag toe" @click="test.addQuestion({})")
        v-divider.ma-4
        GenerateQuestion(:test="test")
</template>

<script>
import QuestionEditor from '@/components/full_view/TestSection/QuestionEditor.vue';
import GenerateQuestion from '@/components/full_view/TestSection/GenerateQuestion.vue';
export default {
    name: 'QuestionsEditor',
    components: {
        QuestionEditor,
        GenerateQuestion
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
    },
};
</script>
""",
        },
        "QuestionEditor": {
            "filepath": os.path.join(base_dir, "TestSection", "QuestionEditor.vue"),
            "content": """
<template lang="pug">
div.d-flex.flex-row
    div
        v-icon(icon="mdi-chevron-up" :disabled="index == 0" @click="moveQuestionUp")
        v-icon(icon="mdi-chevron-down" :disabled="index == test.questions.length - 1" @click="moveQuestionDown")
        v-icon(icon="mdi-delete" color="red" @click="deleteQuestion")
    h3 {{ question.question_number + '. ' }}
    v-textarea(v-model="question.question_context" label="Context" auto-grow :rows="1")
    v-textarea(v-model="question.question_text" label="Vraag text" auto-grow :rows="1")
    v-switch(v-model="question.is_draw_question" label="Tekenvraag")

RubricEditor(:question="question")
</template>

<script>
import RubricEditor from '@/components/full_view/TestSection/RubricEditor.vue';

export default {
    name: 'QuestionEditor',
    components: {
        RubricEditor,
    },
    props: {
        question: {
            type: Object,
            required: true,
        },
        index: {
            type: Number,
            required: true
        },
        test: {
            type: Object,
            required: true
        }
    },
    methods: {
        moveQuestionUp() {
            if (this.index > 0) {
                [this.test.questions[this.index], this.test.questions[this.index - 1]] = [this.test.questions[this.index - 1], this.test.questions[this.index]];
                this.test.setQuestionNumbers();
            }
        },
        moveQuestionDown() {
            if (this.index < this.test.questions.length - 1) {
                [this.test.questions[this.index], this.test.questions[this.index + 1]] = [this.test.questions[this.index + 1], this.test.questions[this.index]];
                this.test.setQuestionNumbers();
            }
        },
        deleteQuestion() {
            this.test.questions.splice(this.index, 1);
            this.test.setQuestionNumbers();

        },
    },
};
</script>
""",
        },
        "RubricEditor": {
            "filepath": os.path.join(base_dir, "TestSection", "RubricEditor.vue"),
            "content": """
<template lang="pug">
b Rubric
v-table(density="compact")
    thead
        tr
            th(style="width: 80px") Pt.
            th(style="width: 150px") Kort
            th Lang
            th Leerdoel
            th(width="55px")
    tbody
        tr(v-for="(rubric_point, point_index) in question.points")
            td.pa-0
                v-number-input(v-model="question.points[point_index].point_weight" type="number" :min="0" controlVariant="stacked" density="compact")
            td.pa-0
                v-textarea(v-model="question.points[point_index].point_name" density="compact" multi-line auto-grow :rows="1")
            td.pa-0
                v-textarea(v-model="question.points[point_index].point_text" auto-grow :rows="1" density="compact")
            td.pa-0
                v-select(:items="test.targets.map((e,index) => {return {name: e.target_name, id: e.id}})" :modelValue="question.points[point_index].target_id" item-title="name" item-value="id" density="compact" @update:model-value="question.points[point_index].target_id = $event")
            td.pa-0
                v-icon(icon="mdi-delete" color="red" @click="question.points.splice(point_index,1)")
v-btn(prepend-icon="mdi-plus" text="Voeg punt toe" @click="question.addRubricPoint({})")
</template>

<script>
export default {
    name: 'RubricEditor',
    props: {
        question: {
            type: Object,
            required: true,
        },
    },
    computed: {
        test() {
            return this.question.test
        }
    }
};
</script>
""",
        },
        "GenerateQuestion": {
            "filepath": os.path.join(base_dir, "TestSection", "GenerateQuestion.vue"),
            "content": """
<template lang="pug">
v-card.ma-2()
    v-card-text
        h3 Genereer nieuwe vraag
        v-radio-group(v-model="test.gpt_question.rtti" inline label="Vraag type")
            v-radio(value="Reproductie" label="Reproductie")
            v-radio(value="Training" label="Training")
            v-radio(value="Transfer" label="Transfer")
            v-radio(value="Inzicht" label="Inzicht")
            v-radio(value="Maakt niet uit" label="Maakt niet uit")
        v-text-field(label="Idee/onderwerp" v-model="test.gpt_question.subject")
        v-number-input(v-model="test.gpt_question.point_count" type="number" :min="0" controlVariant="stacked" density="compact" label="max aantal punten")
        div
            p.text-gray Leerdoel (niets selecteren = alle leerdoelen)
            v-checkbox(v-for="target in test.targets" :label="target.target_name" :modelValue="test.gpt_question.targets[target.id]" @update:modelValue="test.gpt_question.targets[target.id] = !test.gpt_question.targets[target.id]" density="compact")
        v-btn(@click="test.generateGptQuestion()") Genereer vraag
</template>

<script>
export default {
    name: 'GenerateQuestion',
    props: {
        test: {
            type: Object,
            required: true
        }
    }
}
</script>
""",
        },
        "DownloadTest": {
            "filepath": os.path.join(base_dir, "TestSection", "DownloadTest.vue"),
            "content": """
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
""",
        },
        "ScanSection": {
            "filepath": os.path.join(base_dir, "ScanSection", "ScanSection.vue"),
            "content": """
<template lang="pug">
div(v-if="selected_subsection.id == 'load_pages'")
    LoadPages(
        :test="test"
        @load-student-pages="handleLoadStudentPages"
    )

div(v-if="selected_subsection.id == 'scan_pages'")
    ScanPages(
        :test="test"
        :selected_page_id="selected_page_id"
        @update:selected_page_id="$emit('update:selected_page_id', $event)"

    )

div(v-if="selected_subsection.id == 'generate_students'" style="position: relative")
    GenerateStudents(
        :test="test"
        :selected_student_id="selected_student_id"
        :selected_student="selected_student"
        :selected_student_index="selected_student_index"
        @update:selected_student_id="$emit('update:selected_student_id', $event)"
    )
</template>

<script>
import LoadPages from '@/components/full_view/ScanSection/LoadPages.vue';
import ScanPages from '@/components/full_view/ScanSection/ScanPages.vue';
import GenerateStudents from '@/components/full_view/ScanSection/GenerateStudents.vue';

export default {
    name: 'ScanSection',
    components: {
        LoadPages,
        ScanPages,
        GenerateStudents,
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true
        },
        selected_page_id: {
            type: String,
            required: false
        },
        selected_student_id: {
            type: String,
            required: false
        }
    },
    emits: ['update:selected_page_id', 'update:selected_student_id', 'load-student-pages'],
    methods: {
        handleLoadStudentPages(event) {
            this.$emit('load-student-pages', event) // Emit the event
        }
    },
    computed: {
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
    }
};
</script>
""",
        },
        "LoadPages": {
            "filepath": os.path.join(base_dir, "ScanSection", "LoadPages.vue"),
            "content": """
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
""",
        },
        "ScanPages": {
            "filepath": os.path.join(base_dir, "ScanSection", "ScanPages.vue"),
            "content": """
<template lang="pug">
h2 Scan pages
div.d-flex.flex-row
    v-btn(text="Laad alle data" @click="test.scanStudentIdsAndSections()" :loading="test.is_loading")

ImagesPreview(height="calc(100vh - 80px)" :items="test.pages.map((page, index) => {return {page, index, id:page.id, image: page.base64Image, is_loading: page.is_loading_all, title:(index+1).toString()}})" @delete="test.pages.splice(test.pages.findIndex(e => e.id == $event), 1)" :hasDeleteButton="true" v-model="selected_page_id_local")
    template(v-slot:selected="{ item }")
        v-progress-linear(v-if="test.loading.sections" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")

        v-btn(text="laad deze pagina" @click="async () => {this.test.loading.sections = true; await test.pages[item.index].detectStudentId(); await test.pages[item.index].loadSections();this.test.loading.sections = false}")
        v-row.w-100
            v-col
                img(v-if="item.image" style="max-height: 100%; max-width: 100%" v-fullscreen-img="{scaleOnHover: true}" :src="item.image")
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
import ImagesPreview from '@/components/image/ImagesPreview.vue';

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
""",
        },
        "GenerateStudents": {
            "filepath": os.path.join(base_dir, "ScanSection", "GenerateStudents.vue"),
            "content": """
<template lang="pug">
h2 Leerlingen laden
div.d-flex.flex-row
    v-btn(text="Laad leerlingen" @click="test.loadStudents()" :loading="test.loading.students")

div.d-flex.flex-row(style="height: calc(100vh - 72px)")
    v-list(:selected="[selected_student_id]" mandatory style="min-width: 155px; overflow-y: scroll")
        v-list-item Leerlingen
        v-divider
        v-list-item(v-for="student in test.students" :value="student.id" @click="$emit('update:selected_student_id', student.id)") {{ student.student_id }}
    v-divider(vertical)
    div.pa-2(v-if="selected_student")
        h2 Leerling {{ selected_student.student_id}}
        v-expansion-panels()
            v-expansion-panel(v-for="(result, index) in selected_student.results" :title="'Vraag '+result.question.question_number")
                v-expansion-panel-text
                    b {{ result.question.question_text }}
                    v-img(style="max-height: 700px; " :src="result.scan.base64Image")
                    v-textarea(label="antwoord leerling" v-model="selected_student.results[index].scan.text" auto-grow :rows="1")
                    v-btn(text="Scan text" @click="test.students[selected_student_index].results[index].scan.extractText(this.test.test_context, this.test.gpt_provider, this.test.gpt_model)" :loading="test.students[selected_student_index].results[index].scan.is_loading")
</template>

<script>
export default {
    name: 'GenerateStudents',
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_student_id: {
            type: String,
            required: true,
        },
        selected_student: {
            type: Object,
            required: false
        },
        selected_student_index: {
            type: Number,
            required: false
        }

    },
    emits: ['update:selected_student_id'],
};
</script>
""",
        },
        "GradeSection": {
            "filepath": os.path.join(base_dir, "GradeSection", "GradeSection.vue"),
            "content": """
<template lang="pug">
div(v-if="selected_subsection.id == 'grade_students'" style="position: relative")
    GradeStudents(
        :test="test"
        :selected_student_id="selected_student_id"
        :selected_student="selected_student"
        @update:selected_student_id="selected_student_id = $event"
    )
</template>

<script>
import GradeStudents from '@/components/full_view/GradeSection/GradeStudents.vue';

export default {
    name: 'GradeSection',
    components: {
        GradeStudents,
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true
        },
        selected_student_id: {
            type: String,
            required: false
        },
        selected_student: {
            type: Object,
            required: false
        },
    },
    computed: {
        selected_student_id: {
            get() {
                return this.selected_student_id
            },
            set(val) {
                this.$emit('update:selected_student_id', val)
            }
        }
    }
};
</script>
""",
        },
        "GradeStudents": {
            "filepath": os.path.join(base_dir, "GradeSection", "GradeStudents.vue"),
            "content": """
<template lang="pug">
h2 Leerlingen laden
div.d-flex.flex-row
    v-btn(text="Kijk alle leerlingen na" @click="test.gradeStudents()" :loading="test.loading.grading")
div.d-flex.flex-row.w-100(style="height: calc(100vh - 72px)")
    v-list(:selected="[selected_student_id]" mandatory style="min-width: 155px; overflow-y: scroll")
        v-list-item Leerlingen
        v-divider
        v-list-item(v-for="student in test.students" :value="student.id" @click="$emit('update:selected_student_id', student.id)")
            v-progress-linear(v-if="student.is_grading" indeterminate)
            p {{ student.student_id }}
    v-divider(vertical)
    div.pa-2(v-if="selected_student" style="position: relative; overflow-y: scroll; width: calc(100% - 155px)")
        h2 Leerling {{ selected_student.student_id}}
        v-btn(text="Kijk leerling na" @click="test.students[selected_student_index].grade()" :loading="selected_student.is_grading")
        v-progress-linear(v-if="selected_student.is_grading" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")

        v-expansion-panels()
            v-expansion-panel(v-for="(result, index) in selected_student.results" :title="'Vraag '+result.question.question_number")
                v-expansion-panel-text
                    v-btn(@click="test.students[selected_student_index].results[index].grade()" :loading="selected_student.results[index].is_grading") Kijk vraag na
                    br
                    b Vraag:
                    p {{ result.question.question_text }}

                    b Antwoord Leerling:
                    v-img(style="max-height: 700px; " :src="result.scan.base64Image")
                    p {{ selected_student.results[index].scan.text }}

                    b Rubric
                    v-table(density="compact")
                        thead
                            tr
                                th Pt.
                                th Punt
                                th Uitleg
                                th.pa-0(style="width: 55px") Behaald
                                th(style="width: 35%") Feedback
                        tbody
                            tr(v-for="(rubric_point, point_index) in result.question.points")
                                td {{ rubric_point.point_weight }}
                                td {{ rubric_point.point_name }}
                                td {{ rubric_point.point_text }}
                                td
                                    v-checkbox.mx-auto(v-model="selected_student.results[index].point_results[rubric_point.point_index].has_point" density="compact")

                                td.pa-0
                                    v-textarea(v-model="selected_student.results[index].point_results[rubric_point.point_index].feedback" auto-grow :rows="1" density="compact")
                    b Feedback Volledige vraag
                    v-textarea(v-model="selected_student.results[index].feedback" auto-grow :rows="2" density="compact")
</template>

<script>
export default {
    name: 'GradeStudents',
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_student_id: {
            type: String,
            required: false
        },
        selected_student: {
            type: Object,
            required: false
        },
    },
    computed: {
        selected_student_index() {
            return this.test.students.findIndex(e => e.id == this.selected_student_id);
        },
    },
    emits: ['update:selected_student_id']
};
</script>
""",
        },
        "AnalyzeSection": {
            "filepath": os.path.join(base_dir, "AnalyzeSection", "AnalyzeSection.vue"),
            "content": """
<template lang="pug">
div(v-if="selected_subsection.id == 'individual'" style="position: relative")
    IndividualAnalysis(
        :test="test"
        :selected_student_id="selected_student_id"
        :selected_student="selected_student"
        :is_generating_pdf="is_generating_pdf"
        :self_feedback_field="self_feedback_field"
        @update:selected_student_id="$emit('update:selected_student_id', $event)"
        @update:is_generating_pdf="$emit('update:is_generating_pdf', $event)"
        @update:self_feedback_field="$emit('update:self_feedback_field', $event)"
        @download-student-results="$emit('download-student-results')"
        @download-selected-result="$emit('download-selected-result')"

    )
div(v-if="selected_subsection.id == 'group'" style="position: relative")
    GroupAnalysis(:test="test")
</template>

<script>
import IndividualAnalysis from '@/components/full_view/AnalyzeSection/IndividualAnalysis.vue';
import GroupAnalysis from '@/components/full_view/AnalyzeSection/GroupAnalysis.vue';

export default {
    name: 'AnalyzeSection',
    components: {
        IndividualAnalysis,
        GroupAnalysis,
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true
        },
        selected_student_id: {
            type: String,
            required: true
        },
        selected_student: { // Added to pass selected student
            type: Object,
            required: false // It might not always be selected
        },
        is_generating_pdf: {
            type: Boolean,
            required: true,
        },
        self_feedback_field: {
            type: Boolean,
            required: true
        }
    },
    emits: ['update:selected_student_id', "update:is_generating_pdf", 'update:self_feedback_field', 'download-student-results', 'download-selected-result']
};
</script>
""",
        },
        "IndividualAnalysis": {
            "filepath": os.path.join(base_dir, "AnalyzeSection", "IndividualAnalysis.vue"),
            "content": """
<template lang="pug">
div.d-flex.flex-row(style="height: calc(100vh - 0px)")
    v-list(:selected="[selected_student_id]" mandatory style="width: 155px; overflow-y: scroll")
        v-list-item Leerlingen
        v-btn(@click="$emit('download-student-results')" text="Download Alle")
        v-switch(v-model="self_feedback_field_local" label="Zelfreflectieveld")
        v-divider
        v-list-item(v-for="student in test.students" :value="student.id" @click="$emit('update:selected_student_id', student.id)") {{ student.student_id }}
    v-divider(vertical)
    div.pa-2(style="width: calc(100% - 155px); position: relative;overflow-y: scroll" v-if="selected_student || is_generating_pdf_local")
        div.d-flex.flex-row
            v-btn(@click="$emit('download-selected-result')" text="Download Selected Leerling Resultaten")
        v-progress-linear(v-if="is_generating_pdf_local" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")

        div.individualStudentResult(v-for="student in test.students.filter(student => student?.id == selected_student?.id || is_generating_pdf_local)" :class="student?.id == selected_student?.id ? 'selectedStudentResult' : ''" :style="{'overflow-y': 'scroll', 'background-color': is_generating_pdf_local ? 'white' : '', 'color': is_generating_pdf_local ? 'black' : ''}")
            h1 Leerling: {{ student.student_id }}
            h2 Per vraag

            v-table(:theme=" is_generating_pdf_local ? 'light' : ''")
                thead
                    tr
                        th Vraag
                        th(style="width: 30%") Antwoord
                        th Score
                        th Feedback
                        th(style="width: 30%") Score Per Punt
                tbody
                    tr(v-for="(question, index) in test.questions")
                        td {{ question.question_number }}
                        td
                            v-img(:src="student.question_results[question.id].result.scan.base64Image")
                        td {{ student.question_results[question.id].received_points }} / {{ student.question_results[question.id].total_points }}
                        td {{ student.question_results[question.id].result.feedback }}
                        td
                            v-table(:theme=" is_generating_pdf_local ? 'light' : ''")

                                tbody
                                    tr(v-for="point_result in student.question_results[question.id].result.point_results")
                                        td {{ point_result.point.point_name }}
                                        td(style="width: 50px") {{ point_result.has_point ? point_result.point.point_weight : 0 }}
                                        td(style="width: 50%") {{ point_result.feedback.length > 0 ? point_result.feedback : 'Geen feedback' }}
            h2 Per leerdoel
            v-table(:theme=" is_generating_pdf_local ? 'light' : ''")
                thead
                    tr
                        th Leerdoel
                        th Uitleg leedoel
                        th Punten
                        th Percentage
                tbody
                    tr(v-for="target in test.targets")
                        td {{ target.target_name }}
                        td {{ target.explanation }}
                        td {{ student.target_results[target.id].received_points }} / {{ student.target_results[target.id].total_points }}
                        td {{ student.target_results[target.id].percent }}
</template>

<script>
export default {
    name: 'IndividualAnalysis',
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_student_id: {
            type: String,
            required: true
        },
        selected_student: { // Added to pass selected student
            type: Object,
            required: false // It might not always be selected
        },
        is_generating_pdf: {
            type: Boolean,
            required: true,
        },
        self_feedback_field: {
            type: Boolean,
            required: true
        }
    },
    emits: ['update:selected_student_id', "update:is_generating_pdf", 'update:self_feedback_field', 'download-student-results', 'download-selected-result'],
    computed: {
        is_generating_pdf_local: {
            get() {
                return this.is_generating_pdf
            },
            set(val) {
                this.$emit('update:is_generating_pdf', val)
            }
        },
        self_feedback_field_local: {
            get() {
                return this.self_feedback_field
            },
            set(val) {
                this.$emit('update:self_feedback_field', val)
            }
        }
    }
};
</script>
""",
        },
        "GroupAnalysis": {
            "filepath": os.path.join(base_dir, "AnalyzeSection", "GroupAnalysis.vue"),
            "content": """
<template lang="pug">
div.pa-2(style="position: relative")
    h2 Per leerling
    v-table(density="compact")
        thead
            tr
                th Leerling
                th(v-for="question in test.questions") {{question.question_number}}
                th totaal
                th %
        tbody
            tr(v-for="student in test.students")
                td(style="height: fit-content") {{ student.student_id }}
                td(style="height: fit-content" v-for="question in test.questions") {{ student.question_results[question.id].received_points }} / {{ student.question_results[question.id].total_points }}
                td(style="height: fit-content") {{ student.received_points }} / {{ test.total_points }}
                td(style="height: fit-content" :style="{'background-color': getGradeColor(student.received_points / test.total_points)}") {{ (student.received_points / test.total_points * 100).toFixed(1) }}%
            tr
                th Totaal
                th(v-for="question in test.questions") {{ average(test.students.map(e => e.question_results[question.id].received_points)).toFixed(2) }}
                th {{ average(test.students.map(e => e.received_points / test.total_points * 100)).toFixed(1) }}

    h2 Per Leerdoel
    h2 Per leerdoel
    v-table(:theme=" is_generating_pdf ? 'light' : ''")
        thead
            tr
                th Leerdoel
                th Uitleg leedoel
                th Punten
                th Percentage
        tbody
            tr(v-for="target in test.targets")
                td {{ target.target_name }}
                td {{ target.explanation }}
                td {{ target.average_received_points }} / {{ target.total_points }}
                td {{ target.percent }}
</template>

<script>
import { average } from '@/helpers'
export default {
    name: 'GroupAnalysis',
    props: {
        test: {
            type: Object,
            required: true,
        },
        is_generating_pdf: {  // Assuming you might want this here too
            type: Boolean,
            required: false,  // Probably not required at the group level
            default: false,
        },
    },
    setup(){
        return {
            average
        }
    },
    methods: {
        getGradeColor(percent) {
            return this.$parent.getGradeColor(percent)  // Reuse from parent
        },
    },
};
</script>
""",
        },
    "RequestDialog": {
        "filepath": os.path.join(base_dir, "RequestDialog.vue"),
        "content": """
<template lang="pug">
v-dialog(max-width="700")
    template(v-slot:activator="{ props: activatorProps }")
        v-btn(v-bind="activatorProps") Requests ({{ active_requests.length }})
    template(v-slot:default="{ isActive }")
        v-card(title="Requests")
            v-btn(@click="active_requests.forEach((e,index) => {active_requests[index].abort()})") Abort all
            v-card-text
                v-table
                    thead
                        tr
                            th route
                            th params
                            th Model?
                            th(style="width: 100px") tijd
                            th abort
                    tbody
                        tr(v-for="(request, index) in active_requests")
                            td {{ request.route }}
                            td
                                v-btn(density="compact" @click="log(request.params)") params
                            td {{ request.params?.provider }} - {{ request.params?.model }}
                            td {{ request.prettyDuration() }} {{ rerender_timer ? '' : ''}}
                            td
                                v-icon(icon="mdi-close" @click="active_requests[index].abort()" color="red")
</template>

<script>
import { ref } from 'vue';
export default {
    name: 'RequestDialog',
    props: {
        active_requests: {
            type: Array,
            required: true,
        },
    },
    setup() {
        const rerender_timer = ref(true);
        setInterval(() => {
          rerender_timer.value = !rerender_timer.value;
        }, 100);
    return { rerender_timer };
  },
    methods: {
        log(data) {
            console.log(data)
        }
    }
};
</script>
"""
    }
}

    # Create component files
    for component_name, data in components.items():
        create_vue_component(data["filepath"], component_name, data["content"])

    print("Vue component files created successfully.")

if __name__ == "__main__":
    main()