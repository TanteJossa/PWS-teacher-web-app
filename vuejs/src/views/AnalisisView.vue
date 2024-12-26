<template lang="pug">
div

    v-select(
        :items="tests.map(e=>{return {title: e.name, value: e.id}})"
        v-model="selected_test_id"
    )

    v-tabs(v-model='selected_tab')
        v-tab(value="load") Laad
        v-tab(value="analyse" v-if="is_loaded") Analyseer
        v-tab(value="edit" v-if="is_loaded") Bewerk
    v-window(v-model='selected_tab' style="height: calc(100vh - 48px); position: relative")
        v-window-item(value="load") 
            v-row(style="max-height: calc(100dvh - 60px)")
                v-col.v-col-12.v-col-sm-4
                    v-expansion-panels
                        v-expansion-panel
                            v-expansion-panel-title Uitleg
                            v-expansion-panel-text
                                div
                                    h3 Stappenplan
                                    p Stap 1: zorg ervoor dat uw excel bestand er als volgt uit ziet 
                                    img.w-100(
                                        v-fullscreen-img="{scaleOnHover: true}"
                                        src="@/assets/excel_example.png"
                                    )
                                    p Stap 2: zorg ervoor dat het veld boven de studenten (en weegfactortext) leeg is en zorg ervoor dat de weegfactorrij begint met "Weegfactor"
                                    img.w-100(
                                        v-fullscreen-img="{scaleOnHover: true}"
                                        src="@/assets/lege_student_row.png"
                                    )
                                    p Stap 3: U kunt op elk tablad een aparte toets zetten, die worden dan tegelijkertijd ingeladen. U kunt gemakkelijk switchen met de selector hierboven (omhoog scrollen en dan verschijnt een selector)
                    v-file-input(
                        v-model="excel_file"
                        label="excel"
                        show-size
                    )
                    v-btn(
                        @click="loadClassData()"
                    ) Laad in 
                    //- p {{ excel_file }}
                    div.mt-4(v-if="tests.length > 0")
                        h2 Toetsen
                        v-list()
                            v-list-item(
                                v-for="(test, index) in tests"
                                :title="test.name"
                                @click="()=> {}"
                            )   

                                template(v-slot:append)
                                    v-icon(
                                        icon="mdi-delete"
                                        color="red"
                                        @click="this.tests.splice(index, 1); "
                                    )
                                

                v-divider(vertical)
                v-col.v-col-12.v-col-sm-4
                    div(v-if="is_loaded")
                        h1 {{ test.name }}
                        v-divider
                        p vragen: {{test.questions.length}}
                        p studenten: {{test.students.length}}
                        v-divider
                        v-list(v-model="selected_question_number" density="compact")
                            v-list-item(
                                v-for="(question, i) in test.questions"
                                :key="question.question_number"
                                @click="selected_question_number = question.question_number"
                            )   
                                template(v-slot:prepend)
                                    v-list-item-action(start)
                                        v-checkbox(readonly density="compact" :modelValue="question.question_number == selected_question_number")

                                v-list-item-title Vraag {{ question.question_number }} 
                                    
                                ul.pl-5()
                                    li(v-for="section in question.sections") {{ section.name }}

                                
                v-divider(vertical)
                v-col.v-col-12.v-col-sm-4
                    div(v-if="is_loaded && selected_question ")
                        h2 Vraag {{ selected_question.question_number }}
                        v-divider
                        h4 Leerdoelen:
                        v-list(density="compact")
                            v-list-item(v-for="(section,i) in sections")
                                template(v-slot:prepend)
                                    v-list-item-action(start)
                                        v-checkbox(
                                            readonly 
                                            density="compact" 
                                            :modelValue="selected_question.sections.map(e => e.id).includes(section.id)"
                                            @click="clickSectionCheckbox(section)"
                                        )

                                v-list-item-title 
                                    v-text-field(
                                        class="mt-2"
                                        v-model="sections[i].name" 
                                        label="Naam leerdoel"
                                        density="compact"
                                        variant="outlined"
                                    )
                                    
                                template(v-slot:append)
                                    v-icon(icon="mdi-delete" @click="deleteSection(section)" color="red")
                                
                                v-list-item-subtitle 
                                    v-text-field(
                                        class="mt-2"
                                        v-model="sections[i].beschrijving" 
                                        label="Beschrijving leerdoel"
                                        density="compact"
                                        variant="outlined"
                                    )
                                    
                                
                        v-btn(
                            prepend-icon="mdi-plus"
                            @click="sections.push(new data_classes.Section({}))"
                        ) Nieuw leerdoel
                        
        v-window-item(value="analyse" style="overflow-y: scroll")
            div.d-flex.flex-wrap.w-100
                div(style="width: 200px")
                    v-list()
                        v-list-item(
                            title="Type analyse"
                        )
                        v-divider
                        
                        v-list-item(
                            v-for="item in [{'title': 'Student', 'value': 'student'}, {'title': 'Vraag', 'value': 'question'}, {'title': 'Leerdoel', 'value': 'section'}, ]"
                            :title="item.title"
                            :value="item.value"
                            :active="selected_analysis_type == item.value"
                            @click="selected_analysis_type = item.value; selected_analysis_item_id = 'overview'"
                        )

                v-divider(vertical)
                div(style="width: 200px;").h-100
                    v-list().h-100
                        v-list-item(
                            title="Selecteer specifiek"
                        )
                        v-divider
                        v-list-item(
                            title="Overzicht"
                            :value="'overview'"
                            @click="selected_analysis_item_id = 'overview'"
                            :active="selected_analysis_item_id == 'overview'"
                        )
                        v-divider

                        v-list-item(
                            v-for="item in selected_nav_list_items"
                            :title="item.title"
                            :value="item.id"
                            :active="selected_analysis_item_id == item.id"
                            @click="selected_analysis_item_id = item.id"
                        )

                v-divider(vertical)

                div(style="flex: 1; max-width: calc(100% - 400px); min-width: 400px")
                    v-select(v-model="test.data_type" :items="['points', 'percent']")
                    div.pa-2(style="max-height: calc(100% - 56px); overflow-y: scroll;")
                        div(
                            v-if="selected_analysis_item_id == 'overview'"
                        )
                            h1 Overview
                            v-divider
                            //- div(v-if="selected_analysis_type == 'student'")
                            //- div(v-if="selected_analysis_type == 'question'")
                            //- div(v-if="selected_analysis_type == 'section'")

                                //- :headers="resultHeaders"
                            v-expansion-panels(multiple)
                                v-expansion-panel()
                                    v-expansion-panel-title Tabel
                                    v-expansion-panel-text
                                        v-data-table(
                                            :items="resultOverviewItems"
                                            density="compact"
                                        )
                                            template(v-slot:item="{ item }")
                                                tr  
                                                    td(v-for="val in Object.values(item)") 
                                                        | {{ (isNumeric(val) && decCount(val) > 4) ? Math.round(val * 1000) / 1000 : val }}
                                v-expansion-panel()
                                    v-expansion-panel-title Extra
                                    v-expansion-panel-text
                                        div(v-if="selected_analysis_type == 'student'")
                                            b Als studenten
                                            p download hier een pdf met uitprintbare resultaten (per vraag en per leerdoel) per student
                                            b Als vraag
                                            p zie als docent hier welke vragen het slechts gemaakt zijn
                                            b Als leerdoel
                                            p zie als docent hier welke leerdoel het slechts gemaakt zijn
                                v-expansion-panel()
                                    v-expansion-panel-title Grafiek
                                    v-expansion-panel-text 
                                        //- pre {{ chartSeries}}        
                                        apexchart(
                                            :options="chartOptions"
                                            :series="chart_series"
                                            height="400px"
                                        )
                                        p  μ: {{ groupNormalDistribution.mean }}
                                        p  σ: {{ groupNormalDistribution.standard_deviation }}
                                        v-btn(
                                            @click="chart_series = this.chartSeries"
                                        ) Bereken
                                        v-divider
                                        div
                                            h3 Bereken dingen test
                                            v-divider
                                            h4 NormalPDF(x, μ, σ)
                                            v-text-field(
                                                type="number"
                                                label="x"
                                                v-model="calculate_normal.pdf_x"
                                                :step="0.1"
                                            )
                                            b
                                            |  = {{ calculateNormalResults.pdf }}
                                            h4 NormalCDF(x, μ, σ)
                                            v-text-field(
                                                type="number"
                                                label="x"
                                                v-model="calculate_normal.cdf_x"
                                                :step="0.1"
                                            )
                                            b
                                            |  = {{ calculateNormalResults.cdf }}
                                            h4 InvNorm(opp, μ, σ, 'LEFT'|'RIGHT'|'CENTER')
                                            v-slider(
                                                type="number"
                                                label="opp"
                                                v-model="calculate_normal.inv_opp"
                                                min="0"
                                                max="1"
                                            )
                                            v-select(
                                                :items="['LEFT','RIGHT','CENTER']"
                                                label="type"
                                                v-model="calculate_normal.inv_type"
                                            )
                                            b 
                                            | = {{ calculateNormalResults.inv }}
                                v-expansion-panel
                                    v-expansion-panel-title Correlaties
                                    v-expansion-panel-text
                                        apexchart(
                                            width="800px"
                                            height="600px"
                                            :options="heatmap_options"
                                            :series="heatmapData"
                                        )

                        div(
                            v-else-if="selected_item"
                        )   
                            div(v-if="selected_analysis_type == 'student'")
                                h1 {{ selected_item.name }}
                            div(v-if="selected_analysis_type == 'question'")
                                h1 {{ selected_item.name }}
                            div(v-if="selected_analysis_type == 'section'")
                                h1 {{ selected_item.name }}



            

        // Page "Bewerk"-code starts here!
        v-window-item(value="edit")

</template>

<script>
// Data 
import data_classes from '@/classes'
import {  excelFileToJSON, sum, uncircularStringify, decCount, isNumeric } from '@/helpers'


// Components


export default {
    name: 'AnalisisView',
    components: {
    
    },
    props: {
    
    },
    emits: [],
    setup() {
        return { data_classes, uncircularStringify, decCount, isNumeric }
    },
    data(){
        return {
            selected_tab: 'load',

            // loading tab
            excel_file: null,
            test_data: {
                VoorbeeldToets: [
    {
        "__EMPTY": "Student_1",
        "Q1": 6,
        "Q2": 1,
        "Q3": 1,
        "Q4": 5,
        "Q5": 1,
        "Q6": 4,
        "Q7": 6,
        "Q8": 3,
        "Q9": 3,
        "Q10": 4,
        "Total": 34
    },
    {
        "__EMPTY": "Student_2",
        "Q1": 6,
        "Q2": 0,
        "Q3": 1,
        "Q4": 11,
        "Q5": 15,
        "Q6": 3,
        "Q7": 3,
        "Q8": 5,
        "Q9": 3,
        "Q10": 9,
        "Total": 56
    },
    {
        "__EMPTY": "Student_3",
        "Q1": 8,
        "Q2": 1,
        "Q3": 0,
        "Q4": 8,
        "Q5": 7,
        "Q6": 2,
        "Q7": 2,
        "Q8": 7,
        "Q9": 1,
        "Q10": 10,
        "Total": 46
    },
    {
        "__EMPTY": "Student_4",
        "Q1": 11,
        "Q2": 4,
        "Q3": 4,
        "Q4": 12,
        "Q5": 5,
        "Q6": 0,
        "Q7": 6,
        "Q8": 5,
        "Q9": 1,
        "Q10": 4,
        "Total": 52
    },
    {
        "__EMPTY": "Student_5",
        "Q1": 5,
        "Q2": 2,
        "Q3": 5,
        "Q4": 12,
        "Q5": 11,
        "Q6": 4,
        "Q7": 2,
        "Q8": 5,
        "Q9": 1,
        "Q10": 10,
        "Total": 57
    },
    {
        "__EMPTY": "Student_6",
        "Q1": 7,
        "Q2": 1,
        "Q3": 7,
        "Q4": 6,
        "Q5": 11,
        "Q6": 3,
        "Q7": 0,
        "Q8": 6,
        "Q9": 6,
        "Q10": 9,
        "Total": 56
    },
    {
        "__EMPTY": "Student_7",
        "Q1": 10,
        "Q2": 2,
        "Q3": 14,
        "Q4": 6,
        "Q5": 7,
        "Q6": 2,
        "Q7": 0,
        "Q8": 8,
        "Q9": 6,
        "Q10": 7,
        "Total": 62
    },
    {
        "__EMPTY": "Student_8",
        "Q1": 6,
        "Q2": 0,
        "Q3": 0,
        "Q4": 12,
        "Q5": 8,
        "Q6": 1,
        "Q7": 5,
        "Q8": 8,
        "Q9": 4,
        "Q10": 7,
        "Total": 51
    },
    {
        "__EMPTY": "Student_9",
        "Q1": 10,
        "Q2": 2,
        "Q3": 2,
        "Q4": 12,
        "Q5": 8,
        "Q6": 1,
        "Q7": 7,
        "Q8": 5,
        "Q9": 0,
        "Q10": 7,
        "Total": 54
    },
    {
        "__EMPTY": "Student_10",
        "Q1": 6,
        "Q2": 1,
        "Q3": 4,
        "Q4": 8,
        "Q5": 9,
        "Q6": 0,
        "Q7": 0,
        "Q8": 8,
        "Q9": 4,
        "Q10": 2,
        "Total": 42
    },
    {
        "__EMPTY": "Student_11",
        "Q1": 5,
        "Q2": 0,
        "Q3": 3,
        "Q4": 7,
        "Q5": 7,
        "Q6": 2,
        "Q7": 5,
        "Q8": 5,
        "Q9": 3,
        "Q10": 5,
        "Total": 42
    },
    {
        "__EMPTY": "Student_12",
        "Q1": 8,
        "Q2": 2,
        "Q3": 6,
        "Q4": 5,
        "Q5": 6,
        "Q6": 4,
        "Q7": 0,
        "Q8": 8,
        "Q9": 7,
        "Q10": 10,
        "Total": 56
    },
    {
        "__EMPTY": "Student_13",
        "Q1": 5,
        "Q2": 2,
        "Q3": 1,
        "Q4": 13,
        "Q5": 14,
        "Q6": 4,
        "Q7": 3,
        "Q8": 5,
        "Q9": 5,
        "Q10": 3,
        "Total": 55
    },
    {
        "__EMPTY": "Student_14",
        "Q1": 8,
        "Q2": 0,
        "Q3": 5,
        "Q4": 8,
        "Q5": 7,
        "Q6": 0,
        "Q7": 2,
        "Q8": 7,
        "Q9": 6,
        "Q10": 8,
        "Total": 51
    },
    {
        "__EMPTY": "Student_15",
        "Q1": 10,
        "Q2": 6,
        "Q3": 2,
        "Q4": 8,
        "Q5": 4,
        "Q6": 5,
        "Q7": 7,
        "Q8": 4,
        "Q9": 5,
        "Q10": 10,
        "Total": 61
    },
    {
        "__EMPTY": "Student_16",
        "Q1": 8,
        "Q2": 3,
        "Q3": 3,
        "Q4": 4,
        "Q5": 12,
        "Q6": 5,
        "Q7": 5,
        "Q8": 4,
        "Q9": 2,
        "Q10": 3,
        "Total": 49
    },
    {
        "__EMPTY": "Student_17",
        "Q1": 9,
        "Q2": 4,
        "Q3": 4,
        "Q4": 13,
        "Q5": 6,
        "Q6": 2,
        "Q7": 0,
        "Q8": 4,
        "Q9": 6,
        "Q10": 6,
        "Total": 54
    },
    {
        "__EMPTY": "Student_18",
        "Q1": 10,
        "Q2": 3,
        "Q3": 12,
        "Q4": 9,
        "Q5": 4,
        "Q6": 2,
        "Q7": 0,
        "Q8": 8,
        "Q9": 4,
        "Q10": 6,
        "Total": 58
    },
    {
        "__EMPTY": "Student_19",
        "Q1": 7,
        "Q2": 3,
        "Q3": 1,
        "Q4": 12,
        "Q5": 12,
        "Q6": 1,
        "Q7": 0,
        "Q8": 5,
        "Q9": 5,
        "Q10": 7,
        "Total": 53
    },
    {
        "__EMPTY": "Student_20",
        "Q1": 9,
        "Q2": 5,
        "Q3": 4,
        "Q4": 6,
        "Q5": 12,
        "Q6": 2,
        "Q7": 6,
        "Q8": 8,
        "Q9": 2,
        "Q10": 10,
        "Total": 64
    },
    {
        "__EMPTY": "Weegfactor",
        "Q1": 11,
        "Q2": 8,
        "Q3": 17,
        "Q4": 19,
        "Q5": 15,
        "Q6": 12,
        "Q7": 17,
        "Q8": 9,
        "Q9": 11,
        "Q10": 14,
        "Total": 133
    }
]
            },
            selected_test_id: null,
            tests: [],

            // loading tab data
            selected_question_number: null,
            sections: [],

            // analysis tab data
            selected_analysis_type: 'student',
            selected_analysis_item_id: null,

            // table
            result_data_type: 'points',

            // heat map
            comparision_type: 'question',
            heatmap_options: {
                chart: {
                    type: 'heatmap',
                },
                dataLabels: {
                    enabled: true,
                    formatter: function (val, opt) {
                        return Math.round(val * 1000) / 1000
                    },
                    dropShadow: {
                        // enabled: true
                    }
                },
                colors: ["#008FFB"],
                heatmap: {

                    min: -1,
                    max: 1
                },
                tooltip: {
                    theme: 'dark',
                    x: {
                        show: true,
                        formatter: function (value, { series, seriesIndex, dataPointIndex, w }) {
                            return 'Cor(item1, item2) = '
                        }
                    },
                    y: {
                        title: {
                            formatter: function () {
                                return ''
                            }
                        }
                    }
                }
            },
            gradechart_options: {
                chart: {
                    type: 'line',


                },

                stroke: {
                    curve: 'straight',
                },
                tooltip: {
                    theme: 'dark'
                },


            },
            calculate_normal: {
                pdf_x: 0,                
                cdf_x: 0,
                inv_opp: 0.2,
                inv_type: 'LEFT',
            },
            chart_series: []

        }
    },
    computed: {
        test: {
            get(){
                const index = this.tests.findIndex(e => e.id == this.selected_test_id)

                if (index != -1){
                    return this.tests[index]
                }

                return new data_classes.Test({id: -1})

            },
            set(val){
                const index = this.tests.findIndex(e => e.id == val.id)

                if (index != -1){
                    this.tests[index] = val
                }
            }
        },
        is_loaded(){
            return (this.tests.length > 0) 
                    && (this.test.id != -1) 
        },
        selected_question_index(){return this.test.questions.map(e => e.question_number).indexOf(this.selected_question_number)},
        selected_question: {
            get(){
                const index = this.selected_question_index
                if (index != -1){
                    return this.test.questions[index]
                }
                return null
            },
            set(val){
                const index = this.selected_question_index
                if (index != -1){
                    // set without changing reference
                    return this.test.questions[index].set(val)
                }
            }
        },
        selected_nav_list_items(){
            switch (this.selected_analysis_type) {
                case "student":
                    return this.test.students.map(e => {return {title: e.name, id: e.id, item: e}})
                    break;
                case "question":
                    return this.test.questions.map(e => {return {title: 'Vraag '+e.question_number, id: e.id, item: e}})
                    break;
                case "section":
                    return this.test.sections.map(e => {return {title: e.name, id: e.id, item: e}})
                    break;
                                    
                default:
                    return []
                    break;
            }
        },
        selected_item:{
            get(){
                return this.selected_nav_list_items.find( e=> e.id == this.selected_analysis_item_id)
            },
            set(val){
                const index = this.test[selected_analysis_type+"s"].findIndex(e=>e.id==this.selected_analysis_item_id)
                if (index != -1){
                    this.test[selected_analysis_type+"s"][index] = val
                }
            }
        },
        selected_item_results(){
            return this.selectedTypeGroupsById[this.selected_analysis_item_id]
        },
        
        heatmapData(){
            const series = []
            let items = []
            let name_key = ""
            switch (this.selected_analysis_type) {
                case "question":
                    items = this.test.questions.sort((a,b) => a.question_number - b.question_number)
                    name_key = "question_number"

                    break;
                case "student":
                    items = this.test.students
                    name_key = 'name'
                case "section":
                    name_key = this.test.sections
                    name_key = "name"
                default:
                    break;
            }
            items.forEach(item1 => {
                const serie = {
                    name: item1[name_key],
                    data: []
                }

                items.forEach(item2 => {
                    if (item1.id == item2.id) {
                        var result = 1
                    } else {
                        var result = this.test.results.getTypeCorrelation(
                            this.selected_analysis_type,
                            item1.id,
                            item2.id
                        )
                    }

                    serie.data.push(result)
                })

                series.push(serie)
            })

            
            return series
            
        },
        gradechartData(){
            const grade_series = [...Array(20).keys()].map(e => e * 0.5);

            return [{
                type: 'line',
                data: grade_series.map(e => {return  {
                    x: Math.round(e / 10) * 10,
                    y: this.test.grade_formula.method(e / 10)
                }})
            }]

        },

        selectedTypeGroupsById(){
            const grouped_data = {}
            switch (this.selected_analysis_type) {
                case "student":

                    this.test.students.forEach(e => {
                        grouped_data[e.id] = this.test.results.getStudentResults(e.id)
                    })
                    break;
                case "question":
                    this.test.questions.forEach(e => {
                        grouped_data[e.id] = this.test.results.getQuestionResults(e.id)
                    })
                    break;
                case "section":
                    this.test.sections.forEach(e => {
                        grouped_data[e.id] = this.test.results.getSectionResults(e.id)
                    })                
                    break;
                                    
                default:
                    break;
            }

            return grouped_data
        },
        resultOverviewItems(){
            const grouped_data = this.selectedTypeGroupsById
            return Object.keys(grouped_data).map(item_id => {
                const data = grouped_data[item_id]

                let name = ""
                if (this.selected_analysis_type == "student"){
                    const student = this.test.students.find(e => e.id == item_id)
                    name = student.name
                }
                if (this.selected_analysis_type == "question"){
                    const question = this.test.questions.find(e => e.id == item_id)
                    name = "Vraag "+ question.question_number
                }
                if (this.selected_analysis_type == "section"){
                    const section = this.test.sections.find(e => e.id == item_id)
                    name = section.name
                }
                return {
                    name,
                    average: data.average,
                    standard_dev: data.standard_deviation,
                    grade: data.grade,
                    total_points: data.points
                }
            })
        },
        groupNormalDistribution(){
            return new data_classes.NormalDistribution({values: Object.values(this.selectedTypeGroupsById).map(e=> e.average)})
        },
        calculateNormalResults(){
            return {
                pdf: this.groupNormalDistribution.pdf(this.calculate_normal.pdf_x),
                cdf: this.groupNormalDistribution.pdf(this.calculate_normal.cdf_x),
                inv: this.groupNormalDistribution.invNorm(this.calculate_normal.inv_opp, this.calculate_normal.inv_type),

            }
        },
        chartOptions(){
            return {

                chart: {
                    type: 'line',
                    zoom: {
                        enabled: false
                    }

                },
                yaxis: {
                    labels: {formatter: function(value) {return value.toFixed(3);}}
                },
                stroke: {
                    curve: 'monotoneCubic',
                },
                tooltip: {
                    enabled: true,
                    enabledOnSeries: [2,3,4,5],
                    theme: 'dark'
                },
                dataLabels: {
                    enabled: true,
                    enabledOnSeries: []
                },
            }
        },
        pdfSeries(){
            const pdf_series = {
                type: 'scatter',
                name: 'pdf',

                chart: {
                    stroke: {
                        width: '3px'
                    },
                    tooltips:{
                        enabled: true,
                        theme: 'dark'
                    },
                },
                data: [
                    {
                        x: this.calculate_normal.pdf_x,
                        y: this.calculateNormalResults.pdf
                    }
                ]
            }
            return pdf_series
        },
        cdfSeries(){
            const cdf_series = {
                type: 'area',
                name: 'cdf',

                tooltips:{
                    enabled: true,
                    theme: 'dark'
                },
                data: this.groupNormalData.filter(e => e.x < this.calculate_normal.cdf_x)
            }
            return cdf_series
        },
        invSeries(){

            const result = this.calculateNormalResults.inv
            const invnorm_series = {
                type: 'area',
                name: 'inv',
                tooltips:{
                    enabled: true,
                    theme: 'dark'
                },
                data: this.groupNormalData.filter(e => {
                    if (this.calculate_normal.inv_type =='LEFT') {
                        return e.x <= result
                    }
                    if (this.calculate_normal.inv_type =='RIGHT') {
                        return e.x >= result
                    }
                    if (this.calculate_normal.inv_type =='CENTER') {
                        return e.x >= result[0] && e.x < result[1]
                    }
                })
            }
            let data = []
            if (this.calculate_normal.inv_type =='LEFT' || this.calculate_normal.inv_type =='RIGHT') {
                data = [{
                    x: result,
                    y: this.groupNormalDistribution.pdf(result)
                }]
            }

            if (this.calculate_normal.inv_type =='CENTER') {
                data = [
                    {
                        x: result[0],
                        y: this.groupNormalDistribution.pdf(result[0])
                    },
                    {
                        x: result[1],
                        y: this.groupNormalDistribution.pdf(result[1])
                    },
                ]
            }
            const invnorm_x_series = {
                type: 'scatter',
                name: 'inv_x',
                tooltips:{
                    enabled: true,
                    theme: 'dark'
                },
                data
            }
            return [invnorm_series, invnorm_x_series]
        },
        groupNormalData(){
            const normal = this.groupNormalDistribution
            const sigma_range = 4
            const diff = sigma_range * normal.standard_deviation
            const range_start = normal.mean - diff
            const n = 100
            const step = (2 * diff) / n

            const normal_data =  [...Array(n).keys()].map((i) => {
                const x = range_start + i*step
                return {
                    x,
                    y: normal.pdf(x) 
                }      
            })
            return normal_data
        },
        chartSeries(){


            const normal_graph = {
                type: 'line',
                chart: {
                    tooltips: {
                        enabled: false,
                    },
                },
                data: this.groupNormalData
            }

            // caculations
            // pdf
            
            // cdf
            
            // invNorm
            
            


            return [
                normal_graph,
                this.pdfSeries,
                this.cdfSeries,
                ...this.invSeries,
            ]
        }
        
        
    },
    methods: {
        addTestFromJSON(name, data){
            const questions = []
            const STUDENT_ID_KEY = '__EMPTY'
            const POINT_ROW_NAME = "weegfactor"

            const canBeQuestion = (q_name) => {
                const lower_key = q_name.toLowerCase()
                return lower_key.startsWith("q") || lower_key.startsWith("v")
            }
            const getQuestionNumber = (q_name) => {
                return  Number(q_name.replace(/\D/g,''))
            }

            const max_point_row = data.find(e => e[STUDENT_ID_KEY].toLowerCase() == POINT_ROW_NAME ) || {}

            Object.keys(data[data.length - 1]).forEach(key => {
                // Question or Vraag
                if (canBeQuestion(key)){
                    const max_points = max_point_row[key]

                    // only numerals
                    questions.push(new data_classes.Question({
                        question_number:getQuestionNumber(key),
                        total_points: max_points
                    }))
                }
            })

            const students = []

            const result_bundle = new data_classes.ResultBundle({})
            data.forEach(row => {
                const student_id = row[STUDENT_ID_KEY]
                if (student_id.toLowerCase() == POINT_ROW_NAME){
                    return
                }

                const current_student = new data_classes.Student({
                    id: student_id,
                    name: student_id
                })
                students.push(current_student)

                Object.entries(row).forEach(([question_id, points]) => {
                    if (canBeQuestion(question_id)){
                        const result = new data_classes.Result({
                            question: questions.find(e => e.question_number == getQuestionNumber(question_id)) || new data_classes.Question({}),
                            student: current_student,
                            points: points
                        })

                        result_bundle.addResult(result)
                    }
                })
            })


            const new_test = new data_classes.Test({
                results: result_bundle,
                name,
                questions: questions,
                students: students
            })
            new_test.results.test = this.test
            console.log(new_test)
            this.tests.push(new_test)
            this.selected_test_id = new_test.id
        },
        async loadClassData(){
            const data = this.excel_file ? await excelFileToJSON(this.excel_file) : this.test_data
            Object.keys(data).forEach(name => {
                console.log(name, data[name])
                this.addTestFromJSON(name, data[name])
            })
            
        },
        clickSectionCheckbox(section){
            const index = this.selected_question.sections.indexOf(section)
            // found
            if (index != -1) {
                this.selected_question.sections.splice(index, 1)
            } else {
                // not found
                this.selected_question.sections.push(section)

            }
        },
        deleteSection(section){
            if (window.confirm("Weet je zeker dat je " + section.name + " overal wilt verwijderen")) {
                const index = this.sections.indexOf(section)

                this.sections.splice(index,1)
                
                this.test.questions.forEach( (question, question_index) => {
                    question.sections.forEach((question_section, section_index) => {
                        if (section.id == question_section.id){
                            this.test.questions[question_index].sections.splice(section_index, 1)
                        }
                    })
                })
            }
            
            
        }
    },
    watch: {
        excel_file(){
            this.loadClassData
        }
    },
    // created() {
    
    // },
    async mounted() {
        await this.loadClassData()
        this.selected_tab = 'load'


        // const normal = new data_classes.NormalDistribution({mean: 10, standard_dev: 4})
        // normal.invNorm(0.3)
    },
    
    
}
</script>
    
<style scoped>
.mh-100 {
    max-height: 100%
}
</style>
<style>
body {
    overflow: hidden; /* Hide scrollbars */
}
</style>