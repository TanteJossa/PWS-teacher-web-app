<template lang="pug">
div(style="position: relative")
    RequestLoader(
        style="position: fixed"
        v-if="is_loading"
        :current_request_status="currently_loading"
    )
    v-navigation-drawer(
        permanent
        nav
        width="160"
    )
        v-list(
            :selected="[selected_section_id]"
            mandatory
        )
            v-btn(
                text="Laad preload (200MB)"
                @click="loadPreload()"
                :loading="test.loading.preload"
            )
            v-btn(
                text="Download Antwoordpagina"
                @click="downloadAnswerSheet()"
            )
            v-list-item Onderdelen
            v-divider
            v-list-item(
                v-for="section in main_sections"
                :value="section.id"
                @click="selected_section_id = section.id"
            ) {{ section.name }}

            p {{test.loading}}
            p total: {{ total_requests }}
    v-navigation-drawer(
        permanent
        nav
        width="160"

    )
        v-list(
            :selected="[selected_section.selected_subsection_id]"
            mandatory
        )
            v-list-item(
                v-for="(section, index) in selected_section.subsections"
                :value="section.id"
                @click="selected_section.selected_subsection_id = section.id"
                nav
            ) {{ section.name }}
    


    div(v-if="selected_section_id == 'test'")
        div(v-if="selected_subsection.id == 'test' || selected_subsection.id == 'rubric'")
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

                    div(v-for="(item,index) in  test.files[selected_subsection.id].data")
                        v-expansion-panels
                            v-expansion-panel
                                v-expansion-panel-title {{ item.type }}
                                v-expansion-panel-text
                                    div(v-if="item.type == 'text'")
                                        v-textarea(v-model="test.files[selected_subsection.id].data[index].data")
                                    div(v-if="item.type == 'image'")
                                        img(style="height: 300px" :src="item.data")
        div(v-if="selected_subsection.id == 'structure'" style="overflow-y: scroll; position: relative; ")

            RequestLoader(v-if="test.loading.structure")
            v-card()
                v-tabs(v-model="selected_test_source")
                    v-tab(
                        value="gpt"
                    ) AI
                    v-tab(
                        value="pdf"
                    ) PDF's
                v-card-text
                    v-tabs-window(
                        v-model="selected_test_source"
                    )
                        v-tabs-window-item.w-100(
                            value="gpt"
                        )
                            v-radio-group(v-model="test.gpt_test.school_type" inline)
                                v-radio(value="basisschool" label="basisschool") 
                                v-radio(value="vmbo" label="vmbo") 
                                v-radio(value="havo" label="havo") 
                                v-radio(value="vwo" label="vwo") 
                                v-radio(value="mbo" label="mbo") 
                                v-radio(value="hbo" label="hbo") 
                                v-radio(value="universiteit" label="universiteit") 

                            v-number-input(
                                type="number"
                                v-model="test.gpt_test.school_year"
                            )
                            v-text-field(
                                label="Vak"
                                v-model="test.gpt_test.school_subject"
                            )
                            v-text-field(
                                label="Onderwerp"
                                v-model="test.gpt_test.subject"
                            )
                            v-textarea(
                                label="geleerde stof (optioneel)"
                                auto-grow
                                :rows="2"
                                v-model="test.gpt_test.learned"
                            )
                            v-textarea(
                                label="Onderwerpen die voor moeten komen"
                                hint="Scheiden met komma's"
                                auto-grow
                                :rows="2"
                                v-model="test.gpt_test.requested_topics"
                            )
                            v-btn.mt-2(@click="test.generateGptTest()") Genereer vragen

                        v-tabs-window-item(
                            value="pdf"
                        )
                            v-btn(
                                text="Laad structuur met gpt request uit pdfs"
                                @click="test.loadTestStructure()"
                                :loading="test.loading.structure"
                            )
            div
                h2 Leerdoelen
                v-table(
                    density="compact"
                )
                    thead
                        tr
                            th Naam
                            th Uitleg
                            th(width="55px")
                    tbody
                        tr(
                            v-for="(target, index) in test.targets"
                        )
                            td.pa-0
                                v-text-field(
                                    v-model="test.targets[index].target_name"
                                    density="compact"
                                )
                            td.pa-0
                                v-textarea(
                                    v-model="test.targets[index].explanation"
                                    auto-grow
                                    :rows="1"
                                    density="compact"
                                )
                            td.pa-0
                                v-icon(icon="mdi-delete" color="red" @click="test.targets.splice(index,1)" )
                v-btn(
                    prepend-icon="mdi-plus"
                    text="Voeg toe"
                    @click="test.addTarget({})"
                )
            div
                h2 Vragen
                div
                    transition-group
                        v-card.ma-2(
                            v-for="(question, index) in test.questions"
                            :key="question.id"
                        )
                            v-card-text
                                div.d-flex.flex-row
                                    div
                                        v-icon(
                                            icon="mdi-chevron-up"
                                            :disabled="index == 0"
                                            @click="[test.questions[index], test.questions[index-1]] = [test.questions[index-1], test.questions[index]]; test.setQuestionNumbers()"
                                        )
                                        v-icon(
                                            icon="mdi-chevron-down"
                                            :disabled="index == test.questions.length - 1"
                                            @click="[test.questions[index], test.questions[index+1]] = [test.questions[index+1], test.questions[index]]; test.setQuestionNumbers()"
                                        )
                                        v-icon(
                                            icon="mdi-delete"
                                            color="red"
                                            @click="test.questions.splice(index,1)"
                                        )
                                    h3 {{ question.question_number + '. ' }}
                                    v-textarea(
                                        v-model="test.questions[index].question_context"
                                        label="Context"
                                        auto-grow
                                        :rows="1"
                                    )
                                    v-textarea(
                                        v-model="test.questions[index].question_text"
                                        label="Vraag text"
                                        auto-grow
                                        :rows="1"

                                    )
                                v-switch(
                                    v-model="test.questions[index].is_draw_question"
                                    label="Tekenvraag"
                                    
                                )
                                b Rubric
                                v-table(
                                    density="compact"
                                )
                                    thead
                                        tr
                                            th(style="width: 80px") Pt.
                                            th Kort
                                            th Lang
                                            th Leerdoel
                                            th(width="55px")
                                    tbody
                                        tr(
                                            v-for="(rubric_point, point_index) in question.points"
                                        )
                                            td.pa-0
                                                v-number-input(
                                                    v-model="test.questions[index].points[point_index].point_weight"
                                                    type="number"
                                                    :min="0"
                                                    controlVariant="stacked"
                                                    density="compact"
                                                    
                                                )
                                            td.pa-0
                                                v-text-field(
                                                    v-model="test.questions[index].points[point_index].point_name"
                                                    density="compact"
                                                )
                                            td.pa-0
                                                v-textarea(
                                                    v-model="test.questions[index].points[point_index].point_text"
                                                    auto-grow
                                                    :rows="1"
                                                    density="compact"
                                                )
                                            td.pa-0
                                                v-select(
                                                    :items="test.targets.map((e,index) => {return {name: e.target_name, id: e.id}})"
                                                    :modelValue="test.questions[index].points[point_index].target_id"
                                                    item-title="name"
                                                    item-value="id"
                                                    density="compact"
                                                )
                                            td.pa-0
                                                v-icon(icon="mdi-delete" color="red" @click="test.questions[index].points.splice(point_index,1)" )
                                v-btn(
                                    prepend-icon="mdi-plus"
                                    text="Voeg punt toe"
                                    @click="test.questions[index].addRubricPoint({})"
                                )
                    v-btn.ml-4(
                        prepend-icon="mdi-plus"
                        text="Voeg eigen vraag toe"
                        @click="test.addQuestion({})"
                    )
                    v-divider.ma-4
                    v-card.ma-2()
                        v-card-text
                            h3 Genereer nieuwe vraag
                            v-radio-group(v-model="test.gpt_question.rtti" inline label="Vraag type")
                                v-radio(value="Reproductie" label="Reproductie") 
                                v-radio(value="Training" label="Training") 
                                v-radio(value="Transfer" label="Transfer") 
                                v-radio(value="Inzicht" label="Inzicht") 
                                v-radio(value="Maakt niet uit" label="Maakt niet uit") 
                            v-text-field(
                                label="Idee/onderwerp"
                                v-model="test.gpt_question.subject"
                            )
                            v-number-input(
                                v-model="test.gpt_question.point_count"
                                type="number"
                                :min="0"
                                controlVariant="stacked"
                                density="compact"
                                label="max aantal punten"
                                
                            )
                            div
                                p.text-gray Leerdoel (niets selecteren = alle leerdoelen)
                                v-checkbox(
                                    v-for="target in test.targets"
                                    :label="target.target_name"
                                    :modelValue="test.gpt_question.targets[target.id]"
                                    @update:modelValue="test.gpt_question.targets[target.id] = !test.gpt_question.targets[target.id]"
                                    density="compact"
                                )
                                p {{ test.gpt_question.selected_targets.map(e => e.id)}}
                            v-btn(
                                @click="test.generateGptQuestion()"
                            ) Genereer vraag


                            

    div.h-100(v-if="selected_section_id == 'scan'")
        div(v-if="selected_subsection.id == 'load_pages'")
            v-row(style="height: 100vh")
                v-col
                    h2 PDF {{ selected_subsection.name }}
                    b 1 pdf tegelijk (inladen met knop), foto's laden automatisch 
                    div.d-flex.flex-row
                        v-file-input(
                            v-model="test.files.students.raw"
                            accept="application/pdf  image/*"
                            @update:modelValue="loadStudentPages"
                            multiple
                        )
                        v-btn(
                            text="Laad toets"
                            @click="test.loadDataFromPdf(selected_subsection.id)"
                            :loading="test.loading.pdf_data"

                        )
                    object.w-100(style="height: calc(100% - 40px)" :data="test.files.students.url" type="application/pdf" class="internal")
                        embed(

                            v-if="test.files.students.url"
                            :src="test.files.students.url"
                            type="application/pdf"
                        )
                v-col.h-100(style="overflow-y: scroll; position: relative")
                    v-card.d-flex.flex-row(style="position: sticky; top: 0; z-index: 3")
                        h2 Computerdata
                    div.d-flex.flex-wrap
                        div.pa-1(
                            style="position: relative; width: 50%"
                            v-for="(page, index) in test.pages"
                        )
                            RequestLoader(v-if="page.is_loading")
                            div.d-flex.flex-row.flex-wrap
                                v-btn.mr-1(
                                    text="Crop" 
                                    @click="test.pages[index].cropImage()"
                                )
                                v-btn.mr-1(
                                    text="Rode pen" 
                                    @click="test.pages[index].colorCorrect()"
                                )

                                v-select(
                                    :items="page.image_options"
                                    v-model="test.pages[index].selected_image_type"
                                    density="compact"
                                )
                                v-icon.mr-1(
                                    icon="mdi-flip-vertical"
                                    @click="async () => {test.pages[index].image = await rotateImage180(test.pages[index].image)}"
                                )
                                v-icon.ml-auto(
                                    icon="mdi-delete" 
                                    color="red" 
                                    @click="test.files.students.data.splice(index,1)" 
                                )


                            img.w-100(
                                :src="page.image"
                            )
        div(v-if="selected_subsection.id == 'scan_pages'")
            h2 Scan pages
            div.d-flex.flex-row
                v-btn(
                    text="Laad alle data"
                    @click="test.scanStudentIdsAndSections()"
                    :loading="test.is_loading"

                )

            ImagesPreview(

                height="calc(100vh - 80px)"
                :items="test.pages.map((page, index) => {return {page, index, id:page.id, image: page.base64Image, is_loading: page.is_loading_all, title:(index+1).toString()}})"
                @delete="test.pages.splice(test.pages.findIndex(e => e.id == $event), 1)"
                :hasDeleteButton="true"
                v-model="selected_page_id"
            )
                template(v-slot:selected="{ item }" )
                    RequestLoader( v-if="test.loading.sections")
                    v-btn(
                        text="laad deze pagina"
                        @click="async () => {this.test.loading.sections = true; await test.pages[item.index].detectStudentId(); await test.pages[item.index].loadSections();this.test.loading.sections = false}"
                    )
                    v-row.w-100
                        v-col
                            img(
                                v-if="item.image"
                                style="max-height: 100%; max-width: 100%"
                                v-fullscreen-img="{scaleOnHover: true}"
                                :src="item.image" 
                            )
                        v-col.w-50
                            v-text-field(
                                label="Leerlingnummer"
                                v-model="test.pages[item.index].student_id"
                            )
                            v-table
                                thead
                                    tr
                                        th Sectie
                                        th Aangekruisde Vraag
                                tbody
                                    tr(v-for="(section, section_index) in item.page.sections")
                                        td {{ section_index + 1 }}
                                        td
                                            v-number-input(
                                                v-model="test.pages[item.index].sections[section_index].question_number"
                                                type="number"
                                                :min="0"
                                                controlVariant="stacked"
                                                density="compact"
                                                label="aangekruisde vraag"
                                            )
        div(v-if="selected_subsection.id == 'generate_students'" style="position: relative")
            h2 Leerlingen laden
            div.d-flex.flex-row
                v-btn(
                    text="Laad leerlingen"
                    @click="test.loadStudents()"
                    :loading="test.loading.students"
                )
            div.d-flex.flex-row(style="height: calc(100vh - 72px)")
                v-list(
                    :selected="[selected_student_id]"
                    mandatory
                    style="min-width: 155px; overflow-y: scroll"
                )
                    v-list-item Leerlingen
                    v-divider
                    v-list-item(
                        v-for="student in test.students"
                        :value="student.id"
                        @click="selected_student_id = student.id"
                    ) {{ student.student_id }}
                v-divider(vertical)
                div.pa-2(v-if="selected_student")
                    h2 Leerling {{ selected_student.student_id}}
                    v-expansion-panels()
                        v-expansion-panel(
                            v-for="(result, index) in selected_student.results"
                            :title="'Vraag '+result.question.question_number"
                        )
                            v-expansion-panel-text
                                b {{ result.question.question_text  }}
                                v-img(
                                    style="max-height: 700px; "
                                    :src="result.scan.base64Image"
                                )
                                v-textarea(
                                    label="antwoord leerling"
                                    v-model="selected_student.results[index].scan.text"
                                    auto-grow
                                    :rows="1"
                                )
    div.h-100(v-if="selected_section_id == 'grade'")
        div(v-if="selected_subsection.id == 'grade_students'" style="position: relative")
            h2 Leerlingen laden
            div.d-flex.flex-row
                v-btn(
                    text="Kijk alle leerlingen na"
                    @click="test.gradeStudents()"
                    :loading="test.loading.grading"
                )
            div.d-flex.flex-row.w-100(style="height: calc(100vh - 72px)")
                v-list(
                    :selected="[selected_student_id]"
                    mandatory
                    style="min-width: 155px; overflow-y: scroll"
                )
                    v-list-item Leerlingen
                    v-divider
                    v-list-item(
                        v-for="student in test.students"
                        :value="student.id"
                        @click="selected_student_id = student.id"
                        
                    ) 
                        v-progress-linear(v-if="student.is_grading" indeterminate)
                        p {{ student.student_id }}
                v-divider(vertical)
                div.pa-2(v-if="selected_student" style="position: relative; overflow-y: scroll; width: calc(100% - 155px)" )
                    h2 Leerling {{ selected_student.student_id}}
                    v-btn(
                        text="Kijk leerling na"
                        @click="selected_student.grade()"
                        :loading="selected_student.is_grading"

                    )
                    RequestLoader(v-if="selected_student.is_grading")

                    v-expansion-panels()
                        v-expansion-panel(
                            v-for="(result, index) in selected_student.results"
                            :title="'Vraag '+result.question.question_number"
                        )
                            v-expansion-panel-text
                                b Vraag:
                                p {{ result.question.question_text  }}
                                
                                b Antwoord Leerling:
                                    //- v-if="result.question.is_draw_question"
                                v-img(
                                    style="max-height: 700px; "
                                    :src="result.scan.base64Image"
                                )
                                p {{ selected_student.results[index].scan.text }}

                                b Rubric
                                v-table(
                                    density="compact"
                                )
                                    thead
                                        tr
                                            th Pt.
                                            th Punt
                                            th Uitleg
                                            th.pa-0(style="width: 55px") Behaald
                                            th(style="width: 35%") Feedback
                                    tbody
                                        tr(
                                            v-for="(rubric_point, point_index) in result.question.points"
                                        )
                                            td {{ rubric_point.point_weight }}
                                            td {{ rubric_point.point_name }}
                                            td {{ rubric_point.point_text }}
                                            td
                                                v-checkbox.mx-auto(
                                                    v-model="selected_student.results[index].point_results[rubric_point.point_index].has_point"
                                                    density="compact"
                                                )

                                            td.pa-0
                                                v-textarea(
                                                    
                                                    v-model="selected_student.results[index].point_results[rubric_point.point_index].feedback"
                                                    auto-grow
                                                    :rows="1"
                                                    density="compact"

                                                )
                                b Feedback Volledige vraag
                                v-textarea(
                                    v-model="selected_student.results[index].feedback"
                                    auto-grow
                                    :rows="2"
                                    density="compact"
                                )
    div.h-100(v-if="selected_section_id == 'analyze'")
        div(v-if="selected_subsection.id == 'individual'" style="position: relative")
            div.d-flex.flex-row(style="height: calc(100vh - 0px)")
                v-list(
                    :selected="[selected_student_id]"
                    mandatory
                    style="width: 155px; overflow-y: scroll"
                )
                    v-list-item Leerlingen
                    v-btn(
                        @click="downloadStudentResults()"
                        text="Download Alle"
                    )
                    v-switch(
                        v-model="self_feedback_field"
                        label="Zelfreflectieveld"
                    )
                    v-divider
                    v-list-item(
                        v-for="student in test.students"
                        :value="student.id"
                        @click="selected_student_id = student.id"
                    ) {{ student.student_id }}
                v-divider(vertical)
                div.pa-2(style="width: calc(100% - 155px); position: relative;overflow-y: scroll" v-if="selected_student || is_generating_pdf" )
                    div.d-flex.flex-row

                        v-btn(
                            @click="downloadSelectedResult()"
                            text="Download Selected Leerling Resultaten"
                        )
                    RequestLoader.w-100.h-100(v-if="is_generating_pdf" :current_request_status="'Generating PDF '" style="color: black")
                    div.individualStudentResult(
                        v-for="student in test.students.filter(student => student?.id == selected_student?.id || is_generating_pdf)"
                        :class="student?.id == selected_student?.id ? 'selectedStudentResult' : ''"
                        :style="{'overflow-y': 'scroll', 'background-color': is_generating_pdf ? 'white' : '', 'color': is_generating_pdf ? 'black' : ''}"
                    )
                        h1 Leerling: {{ student.student_id }}
                        h2 Per vraag

                        v-table(:theme=" is_generating_pdf ? 'light' : ''" )
                            thead
                                tr
                                    th Vraag
                                    th(style="width: 30%") Antwoord
                                    th Score
                                    th Feedback
                                    th(style="width: 30%") Score Per Punt
                            tbody
                                tr(
                                    v-for="(question, index) in test.questions"
                                )
                                    td {{ question.question_number }}
                                    td 
                                        v-img(
                                            :src="student.question_results[question.id].result.scan.base64Image"
                                        )
                                    td {{ student.question_results[question.id].received_points }} / {{ student.question_results[question.id].total_points }}
                                    td {{ student.question_results[question.id].result.feedback }}
                                    td 
                                        v-table(:theme=" is_generating_pdf ? 'light' : ''" )
                                            
                                            tbody
                                                tr(
                                                    v-for="point_result in student.question_results[question.id].result.point_results"
                                                )
                                                    td {{ point_result.point.point_name }}
                                                    td(style="width: 50px") {{ point_result.has_point ? point_result.point.point_weight : 0 }}
                                                    td(style="width: 50%") {{ point_result.feedback.length > 0 ? point_result.feedback : 'Geen feedback' }}
                        h2 Per leerdoel
                        v-table(:theme=" is_generating_pdf ? 'light' : ''" )
                            thead
                                tr
                                    th Leerdoel
                                    th Uitleg leedoel
                                    th Punten
                                    th Percentage
                            tbody
                                tr(
                                    v-for="target in test.targets"
                                )
                                    td {{ target.target_name }}
                                    td {{ target.explanation }}
                                    td {{ student.target_results[target.id].received_points }} / {{ student.target_results[target.id].total_points }}
                                    td {{ student.target_results[target.id].percent }}

        div.pa-2(v-if="selected_subsection.id == 'group'" style="position: relative")
            h2 Per leerling
            v-table(density="compact")
                thead
                    tr 
                        th Leerling
                        th(v-for="question in test.questions") {{question.question_number}}
                        th totaal
                        th %
                tbody
                    tr(
                        v-for="student in test.students"
                    )
                        td(style="height: fit-content") {{ student.student_id }}
                        td(style="height: fit-content")(v-for="question in test.questions") {{ student.question_results[question.id].received_points }} / {{ student.question_results[question.id].total_points }}
                        td(style="height: fit-content") {{ student.received_points }} / {{ test.total_points }}
                        td(style="height: fit-content")(:style="{'background-color': getGradeColor(student.received_points / test.total_points)}") {{ (student.received_points / test.total_points * 100).toFixed(1) }}%
                    tr
                        th Totaal
                        th(v-for="question in test.questions") {{ average(test.students.map(e => e.question_results[question.id].received_points)).toFixed(2) }}
                        th {{ average(test.students.map(e => e.received_points / test.total_points * 100)).toFixed(1) }}

            h2 Per Leerdoel
            h2 Per leerdoel
            v-table(:theme=" is_generating_pdf ? 'light' : ''" )
                thead
                    tr
                        th Leerdoel
                        th Uitleg leedoel
                        th Punten
                        th Percentage
                tbody
                    tr(
                        v-for="target in test.targets"
                    )
                        td {{ target.target_name }}
                        td {{ target.explanation }}
                        td {{ target.average_received_points }} / {{ target.total_points }}
                        td {{ target.percent }}

                            
</template>

<script>
// Data 
import { imageToPngBase64, rotateImage180, average, total_requests, downloadPdfFromBase64, blobToBase64 } from '@/helpers'
import { Test } from '@/scan_api_classes'
import test_example from '@/assets/test_example.pdf'
import rubric_example from '@/assets/rubric_example.pdf'
import toets_example from '@/assets/24-11-13_PWStoetsG3B.pdf'
import answer_print from '@/assets/answer_print.pdf'

// Components
import ImagesPreview from '@/components/image/ImagesPreview.vue'

export default {
    name: 'FullView',
    components: {
        ImagesPreview
    },
    props: {

    },
    emits: [],
    setup() {
        return {
            total_requests,
            rotateImage180,
            average
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
                            id: "structure"
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
                            id: "generate_students"
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
                            id: "grade_students"
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
                const index = this.test.students.findIndex(e => e.id == this.selected_student_id)

                if (index != -1) {
                    this.test.students[index] = val
                }
            }
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
        }
    },
    methods: {
        log(s) { console.log(s) },
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
            var blob = new Blob([arrayBuffer], { type: contentType });

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
                if (file.type.startsWith('image/')){
                    const base64png = await imageToPngBase64(file)
                    if (base64png){
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
        printTest(){
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
        async downloadStudentResults(){
            this.is_generating_pdf = true
            // wait for component updates
            console.log(this.test.student_pdf_data)
            await this.test.downloadStudentResults(this.self_feedback_field)
            this.is_generating_pdf = false

        },
        async downloadSelectedResult(){
            this.is_generating_pdf = true
            // wait for component updates
            if (this.selected_student){
            console.log(this.selected_student)

                await this.selected_student.downloadStudentResult(this.self_feedback_field)
            }
            this.is_generating_pdf = false

        },
        getGradeColor(percent){
            
            if (percent < 0.55){
                return 'rgba(255,100,100,'+(-percent + 0.55)+')'

            } 

            return 'rgba(100,255,100,'+(percent - 0.55)+')'
        },
        async downloadAnswerSheet(){
            const pdf_blob = await this.loadBlob(answer_print)
            const base64_pdf = await blobToBase64(pdf_blob)
            downloadPdfFromBase64(base64_pdf, 'AnswerSheetToetsPWS')
        },

        async loadPreload(){
            this.is_loading =  true
            
            this.currently_loading = 'Downloading pdfs'
            try{
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
                this.test.files.test.url = URL.createObjectURL(test_blob)//await this.toDataURL(test_blob)
                await this.test.loadDataFromPdf('test')
                this.test.files.rubric.raw = rubric_blob
                this.test.files.rubric.url = URL.createObjectURL(rubric_blob)//await this.toDataURL(rubric_blob)
                await this.test.loadDataFromPdf('rubric')
                // 

                this.currently_loading = 'structure'
                await this.test.loadTestStructure(true)

                // 
                this.currently_loading = 'student PDF'

                this.test.files.students.raw = student_blob
                this.test.files.students.url = URL.createObjectURL(student_blob)//await this.toDataURL(student_blob)
                
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
                this.is_loading =  false
            } catch (e){
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
        




    },


}

</script>

<style scoped>
</style>
