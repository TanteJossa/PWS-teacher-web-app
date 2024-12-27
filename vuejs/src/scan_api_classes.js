import axios from 'axios';
import { getRandomID } from './helpers';
import { globals } from '@/main'
import saved_section_data from '@/saved_section_data.json'
import saved_student_data from '@/saved_student_data.json'
const use_localhost = true
// const endpoint = 'http://localhost:8080'
var endpoint = (use_localhost&&(location.hostname === "localhost" || location.hostname === "127.0.0.1")) ? 'http://localhost:8080' : 'https://toetspws-function-771520566941.europe-west4.run.app'
import {ref} from 'vue'
import saved_output from '@/saved_output.json'

var total_requests = ref(0)

const apiRequest = async (route, data) => {

    total_requests.value += 1
    const response = await axios.post(endpoint+route, data);
    

    if (response.data
    && response.data.output){
        return response.data.output
    }

    console.warn('Request error', response)

    return response
}

class ContextData {
    constructor({
        contexts= {},
        questions= {},
        rubrics= {},
    }){
        this.contexts = contexts
        this.questions = questions
        this.rubrics = rubrics
    }
    getQuestion(id){
        return this.questions[id] || ""
    }
    getRubric(id){
        return this.rubrics[id] || ""
    }
    getContext(id){
        return this.contexts[id] || ""
    }
}


class ScanPage {
  constructor(base64Image, context_data=new ContextData({})) {
    this.base64Image = base64Image;
    this.id = getRandomID()

    this.student_id = null;
    this.colorCorrected = null;
    this.redPenExtracted = null;
    this.croppedImage = null;
    this.squareImage = null;
    this.squareData = [];
    this.sections = [];
    this.questions = [];
    this.total_result = {}
    this.context_data = context_data
    
    this.is_loading_all = false;
    this.loading = {
        all: false,

        student_id: false,
        crop: false,
        col_cor: false,

        detect_squares: false,
        detect_qr: false,

        create_sections: false,
        create_question: false,
        
    },
    this.selected_image_type = 'raw'


  }
    get is_loading(){
        return Object.values(this.loading).some(e => e)
    }
    get image(){
        switch (this.selected_image_type) {
            case "raw":
                return this.base64Image
                break;
            case "cropped":
                return this.croppedImage
                break;
            case "colcor":
                return this.colorCorrected
                break;
            default:
                break;
        }

    }
    get image_options(){
        const options = ['raw']
        if (this.croppedImage){
            options.push('cropped')
        }
        if (this.colorCorrected){
            options.push('colcor')
        }
        return options
    }
    generateRandomId() {
        return Math.random().toString(36).substring(2, 15);
    }

    async cropImage() {
        try {
            this.loading.crop = true
            const response = await apiRequest('/crop', {
                Base64Image: this.base64Image
            });
            if (response) {
                this.selected_image_type = 'cropped'
                this.croppedImage = response;
            } else {
                console.error('Error cropping image:', response.data);
            }

            this.loading.crop = false
        } catch (error) {
            console.error('API call to crop image failed:', error);
        }
    }
    // Color correction and extraction of red pen marks
    async colorCorrect() {
        this.loading.col_cor = true
        const response = await apiRequest('/extract_red_pen', {
            Base64Image: this.image,
        });
        console.log(response)
        this.colorCorrected = response.clean;
        this.loading.col_cor = false
        this.selected_image_type = 'colcor'
        return this.colorCorrected;
    }

    async detectQrSections(){
        this.loading.detect_qr = true
        const response = await apiRequest('/get_qr_sections', {
            Base64Image: this.image,
        });
        this.squareImage = response?.image || null
        response?.sections?.forEach(e => {
            const section = new ScanSection({
                full: e.section_image,
                answer: e.section_image,
                question_number: e.data,
                is_qr_section: true
            })

            this.sections.push(section)
        });
        console.log(response)

        this.loading.detect_qr = false
        return this.colorCorrected;
    }
    async detectStudentId(){
        this.loading.student_id = true
        const response = await apiRequest('/get_student_id', {
            Base64Image: this.image,
        });
        console.log('detectStudentId: ', response)
        
        this.student_id = response?.result?.text || null
        
        this.loading.student_id = false
    }
    // Detect squares on the image
    async detectSquares() {
        this.loading.detect_squares = true
        const response = await apiRequest('/detect_squares', {
            Base64Image: this.image,
        });
        this.squareData = response?.data || [];
        this.squareImage = response?.image || ""
        this.loading.detect_squares = false
        return this.squareData;
    }
    // calculate everything
    async scanPage() {
        this.loading.all = true
        console.log('started scan page: ', this)
        const response = await apiRequest('/scan_page', {
            Base64Image: this.image,
        });
        console.log('scanPage: ', response)
        this.total_result = response;

        if (this.total_result){
            this.loadPageDataFromTotal( this.total_result)

        }
        this.loading.all = false
        return this.total_result;
    }

    loadPageDataFromTotal(total){
        if (!total){
            return null
        }

        this.student_id = total.student_id_data?.result.text || ""
        this.redPenExtracted = total.red_pen_base64 || ""
        this.croppedImage = total.cropped_base64 || ""
        total.questions.forEach(q => {
            const question =  new ScanQuestion({base64Image:q.image})
            question.base64Image = q.image
            question.question_number = q.question_id.toString()
            question.text = q.text_result?.result?.correctly_spelled_text || ""
            question.student_handwriting_percent = q.text_result?.result?.student_handwriting_percent || ""
            this.questions.push(question)
        })

    }

    // Create sections based on square data
    async createSections() {
        this.loading.create_sections = true
        const response = await apiRequest('/extract_sections', {
            Base64Image: this.image,
            square_data: this.squareData
        });
        if (response?.sections){

            this.sections = response.sections.map(section => new ScanSection({
                full: section.full, 
                section_finder: section.section_finder, 
                question_selector: section.question_selector, 
                answer: section.answer,
                student_id: this.student_id
            }));
        }
        this.loading.create_sections = false
    }

    // Extract text from sections, turning them into Question objects if they match the criteria
    async extractQuestions() {
        this.loading.create_question = true
        await Promise.all(this.sections.map(section => section.extractQuestion()))
        this.loading.create_question = false
    }
    async loadSections(){
        await this.detectSquares()
        await this.createSections()
        await this.extractQuestions()
    }

    // Link with other answer sections
    async linkAnswers() {
        this.is_loading = true
        const unique_questions = [...new Set(this.sections.map(e => e.question_number))].filter(e => e != 0)
        console.log(unique_questions)
        const response = await Promise.all(unique_questions.map(async question_number => {
            const response = await apiRequest('/link_answer_sections', {
                sections: this.sections.filter(e => e.question_number == question_number).map(section => section.answer),
            })
            console.log(response)
            return {response, question_number}
        }))
        this.questions = response.map(e => new ScanQuestion({base64Image: e.response, question_number: e.question_number, page:this}))

        this.is_loading = false
    }
    async extractText(){
        this.is_loading = true
        await Promise.all(this.questions.map(question => question.extractText()))
        this.is_loading = false
    }

}


class ScanSection {
    constructor({
        full=null,
        section_finder=null,
        question_selector=null,
        answer=null,
        question_number=null,
        question_number_data=null,
        is_qr_section=false,
        student_id=null
    }) {
        this.id = getRandomID()
        this.is_loading = false
        this.full = full
        this.section_finder = section_finder
        this.question_selector = question_selector
        this.answer = answer
        this.is_qr_section = is_qr_section
        this.student_id = student_id
        this.question_number = question_number
        this.question_number_data = question_number_data
    }

    async extractQuestion(){
        this.is_loading = true
        const response = await apiRequest('/question_selector_info', {
            Base64Image: this.question_selector,
        });
        console.log(response)
        this.question_number = response.most_certain_checked_number || 0;
        this.question_number_data = response
        this.is_loading = false
        return response
    }


}
class ScanQuestion {
    constructor({
        base64Image="", 
        question_number="", 
        text="",
        data={},
        page=new ScanPage({})
    }) {
        this.id = getRandomID()

        this.base64Image = base64Image
        this.question_number = question_number
        this.text = text
        this.data = data
        this.page = page
    }


    // Extract text from the section based on the bounding box
    async extractText(context=null) {
        this.is_loading = false

        if (!context){
            context = this.page.context_data
        }

        const response = await apiRequest('/extract_text', {
            Base64Image: this.base64Image,
            questionText: context.getQuestion(this.question_number.toString()),
            rubricText: context.getQuestion(this.question_number.toString()),
            contextText: context.getContext(this.question_number.toString()),

        });
        console.log(response)
        this.text = response.result?.correctly_spelled_text || "";
        this.data = response
        this.is_loading = false
        return { text: this.text };
    }

}

class Test {
    constructor({
        id=getRandomID(),

        files={
            test: {
                raw: null,
                blob: null,
                data: [],
            },
            rubric: {
                raw: null,
                blob: null,
                data: [],
            },
            students: {
                raw: null,
                blob: null,
                data: [],
            },
        },
        questions=[], 
        students=[],
        targets=[],
        pages=[],

        test_data_result=null,
    }){
        this.id = id
        this.files = files

        this.pages = pages

        this.questions = questions.map(e => new Question({test: this, ...e}))
        this.students = students.map(e => new Student({test: this, ...e}))
        this.targets = targets.map(e => new Target({test: this, ...e}))
        this.test_data_result=test_data_result

        this.loading = {
            pdf_data: false,
            structure: false,
            sections: false,
            students: false,

        }
    }
    get is_loading(){
        return Object.values(this.loading).some(e => e)
    }
    async loadDataFromPdf(field_type){
        this.loading.pdf_data = true
        if (["rubric", "test"].includes(field_type)) {
            this.files[field_type].data = await globals.$extractTextAndImages(this.files[field_type].raw)

        } else if (["students"].includes(field_type)){
            this.students.data = await globals.$pdfToBase64Images(this.files[field_type].raw)

            this.students.data.forEach(page => {
                this.addPage(page)
            })
        }
        this.loading.pdf_data = false
    }
    async loadTestStructure(){
        this.loading.structure = true
        const request_text = `
        Je krijg een toets en de antwoorden. Jouw taak is om die zo goed en precies mogelijk in een digitaal formaat om te zetten.
        je hoeft niets te doen met de context om een vraag. Het gaat alleen om de vraag zelf
        Extraheer uit de teksten de vragen:
            vraag tekst: de exacte tekst van de vraag
            question_number: 
                dit is het nummer van de vraag, oftewel vraagnummer, dit kan ook een samenstelling zijn van nummers en letters: 1a, 4c enz. Het is SUPER belangrijk dat dit bij ELKE vraag wordt gegeven.
            is_draw_question: geeft aan of het antwoord bij deze vraag het antwoord geen puur tekstantwoord is
            points: Haal uit de rubric bij elke vraag de rubric punten, als er geen punten in de rubric staan moet je zelf punten bedenken.
        elk punt heeft:
            een naam (point_name) met in 1 of 2 woorden waar die punt overgaat
            een tekst (point_text) met daarin de exacte uitleg van dit punt
            een nummber (point_index) welk punt dit is, bij deze vraag, start bij 0
            een gewicht (point_weight) voor hoeveel punten deze rubricpoint mee telt
            leerdoel (target_name) het leerdoel waar dit punt bij hoort
        
        Daarmaast moet je bij de hele toets een paar overkoepelende leerdoelen bedenken.
        Elk leerdoel heeft een korte naam: dit is ook de naam die bij elk punt waar dit leerdoel het meest bij hoort wordt ingevuld
        en een uitleg (explanation) met daarin exact wat dit leerdoel inhoud.


        geeft de resultaten in de taal van de gegeven toets(vaak zal dat Nederlands zijn)

        de question_number bij de vragen moet bij elke vraag aanwezig zijn

        Houd je altijd aan het gegeven schema

        Hier volgt de toets:
            
        `

        const test_data = this.files.test.data
        const rubric_data = this.files.rubric.data


        const result = saved_output

        // const result = await apiRequest('/test-data', {
        //     requestText: request_text,
        //     testData: {
        //         toets: test_data,
        //         rubric: rubric_data
        //     }
        // })



        console.log(result)
        this.test_data_result = result
        this.loadTestData()
        this.loading.structure = false
    }
    loadTestData(){
        this.targets = []

        this.test_data_result.targets.forEach(e => {
            this.addTarget(e)
        })
        this.questions = []

        this.test_data_result.questions.forEach(e => {
            this.addQuestion(e)
        })
    }
    addTarget(target){


        this.targets.push(new Target({
            test: this,
            ...target
        }))
    }
    addQuestion(question){
        if (question.question_number){

            this.questions.push(new Question({
                test: this,
                ...question,
            }))
        } else {
            console.log('Could not find question id for: ', question)
        }
    }
    createPages(){
        this.files.students.data.forEach(image => {
            this.addPage(image)
        })
    }
    get test_context(){
        return new ContextData({
            questions: this.questions.reduce((data, e) => {
                data[e.question_number] = e.question_text
                return data
            }, {}),
            rubrics: this.questions.reduce((data, e) => {
                data[e.question_number] = e.points.map(e => e.point_text).join("\n")
                return data
            }, {}),
        })
    }

    addPage(base64Image){


        // TODO: fix the ScanPage
        this.pages.push(new ScanPage(base64Image, this.test_context))
    }
    async scanStudentIdsAndSections(use_preloaded = false){
        this.loading.sections = true
        const preload = []
        await Promise.all(
        this.pages.map(async (page, index) => {
        // for (let index = 0; index < this.pages.length;index++){

                
            if (use_preloaded){
                this.pages[index].student_id = saved_section_data[index].student_id || ""

                this.pages[index].sections = saved_section_data[index].sections.map(e => {
                    return new ScanSection(e)
                })
            } else {
                await this.pages[index].detectStudentId()
                await this.pages[index].loadSections()
                preload.push({
                    student_id: this.pages[index].student_id,
                    secions: this.pages[index].sections
                })
                console.log('preload: ', preload)
            }
        // }
        }))


        this.loading.sections = false


    }
    async loadStudents(use_preload = false){
        this.loading.students = true

        if (use_preload){
            saved_student_data.forEach(student_data => {
                const student = new Student({
                    test: this,
                    student_id: student_data.student_id
                })

                this.questions.forEach(question => {
                    const result = student_data.results.find(e => e.scan?.question_number == question.question_number)
                    const question_result = new StudentQuestionResult({
                        student: student,
                        question_id: question.id,
                        // conversion mistake
                        scan: result?.scan?.base64Image

                    })
                    
                    question_result.resetPoints()

                    student.results.push(question_result)
                })

                this.students.push(student)

            })
            this.students.sort((a,b) => a.student_id - b.student_id)
            this.loading.students = false

            return 

        } 
        const unique_student_ids = [...new Set(this.pages.map(e => e.student_id))].filter(e => e)
        unique_student_ids.sort()
        const test_context = this.test_context

        await Promise.all(unique_student_ids.map(async student_id => {
        // for (const student_id in unique_student_ids){
            const student_pages = this.pages.filter(e => e.student_id == student_id)

            var student_sections = []

            student_pages.forEach(page => {
                student_sections = student_sections.concat(page.sections)
            });

            var scan_questions = await Promise.all(this.questions.map(async question => {
                const question_sections = student_sections.filter(section => section.question_number.toString() == question.question_number.toString())
                if (question_sections.length == 0){
                    return {success: false, question_id: question.id}

                }
                const response = await apiRequest('/link_answer_sections', {
                    sections: question_sections.map(section => section.answer),
                })

                if (!response || response.error) {
                    return {success: false, question_id: question.id}
                }

                const scan_question = new ScanQuestion({
                    base64Image: response, 
                    question_number: question.question_number
                })

                await scan_question.extractText(test_context)

                return {success: true, question_id: question.id, scan_question}
            }))

            const student = new Student({
                test:this, 
                student_id: student_id, 
            })

            scan_questions.forEach(scan_question => {
                
                const question_result = new StudentQuestionResult({
                    student: student,
                    question_id: scan_question.question_id,
                    scan: scan_question.success ? scan_question.scan_question : undefined
                })
                question_result.resetPoints()

                student.results.push(question_result)
            })

            this.students.push(student)
        // }
        }))
        console.log(this)

        this.loading.students = false
    }
    async gradeStudents(){
        await Promise.all(this.students.map(e => e.grade()))
    }

}


class Question {
    constructor({
        test=new Test({}),
        id=getRandomID(),
        question_number="",
        question_text="",
        answer_text="",
        is_draw_question=false,
        points=[],
    }){
        this.test = test
        this.is_draw_question = is_draw_question
        this.id = id
        this.question_number = question_number
        this.question_text = question_text
        this.answer_text = answer_text
        this.points = []

        points.forEach(e => this.addRubricPoint(e))
    }
    addRubricPoint(point){
        const target = this.test.targets.find(e => e.target_name == point.target_name)

        
        this.points.push(new RubricPoint({
            question:this,
            ...point,
            target
        }))
    }
}

class RubricPoint {
    constructor({
        question=new Question({}),
        id=getRandomID(),
        point_text="",
        point_name="",
        point_weight=1,
        point_index=0,
        target=new Target({}),
        target_id=null
    }){
        this.question = question

        this.id = id
        this.point_index = point_index
        this.point_text = point_text
        this.point_name = point_name
        this.point_weight =  point_weight
        this.target_id = target_id || target.id
    }
    get target(){
        return this.question.test.targets.find(e => e.id == this.target_id)
    }
}

class Target {
    constructor({
        test=new Test({}),
        id=getRandomID(),
        target_name="",
        explanation="",
    }){
        this.test = test

        this.id = id
        this.target_name = target_name
        this.explanation = explanation
    }
}

class Student {
    constructor({
        test=new Test({}),
        id=getRandomID(),
        student_id="",
        results=[],
        is_grading=false,
    }){ 
        this.test = test
        this.id = id
        this.student_id = student_id
        this.results = results.map(e => new StudentQuestionResult({
            student: this,
        }))
        this.results.forEach((e, index) => this.results[index].resetPoints())
        this.is_grading = is_grading
    }
    async grade(){
        this.is_grading = true
        await Promise.all(this.results.map(async question_result => {
            await question_result.grade()
        }))


        this.is_grading = false
    }
}

class StudentQuestionResult {
    constructor({
        id=getRandomID(),
        student=new Student({}),
        question_id="",
        feedback="",
        point_results={},
        scan=new ScanQuestion({}),
        is_grading=false
    }) {
        this.id = id
        this.student = student
        this.question_id = question_id
        this.feedback = feedback
        this.point_results = point_results
        this.scan = new ScanQuestion(scan)
        this.is_grading = is_grading

    }
    get question(){
        return this.student.test.questions.find(e => e.id == this.question_id) || new Question({})
    }
    resetPoints(){
        this.point_results = []
        this.question.points.forEach(point => {
            this.point_results[point.point_index] = new StudentPointResult({
                student_result: this,
                point_index: point.point_index
            })
        })
    }
    async grade(){
        this.is_grading = true

        const context = this.student.test.test_context

        const response = await apiRequest('/grade', {
            rubric: context.getRubric(this.question.question_number),
            question: context.getQuestion(this.question.question_number),
            answer: this.scan.text,
            studentImage: this.question.is_draw_question ? this.scan.base64Image : undefined
        })
        console.log('Graded: student ', this.student.student_id, '  question: ', this.question.question_number,':' , response)
        if (response && response.result ){
            this.feedback = response.result.feedback
            response.result.points.forEach(response_point => {
                // const index = this.points.findIndex(point => point.point.point_index = response_point.point_index)
                if (this.point_results[response_point.point_index]){
                    this.point_results[response_point.point_index].has_point = response_point.has_point
                    this.point_results[response_point.point_index].feedback = response_point.feedback
                }

            })
        }

        this.is_grading = false
    }
}

class StudentPointResult {
    constructor({
        id=getRandomID(),
        student_result=new StudentQuestionResult({}),
        has_point=null,
        feedback="",
        point_index="",
    }){
        this.id = id
        this.student_result = student_result
        this.has_point = has_point
        this.feedback = feedback
        this.point_index = point_index
    }
    get point(){
        return this.student_result.question.points.find(e => e.point_index == this.point_index) || new RubricPoint({})
    }
}









export {
    ScanPage,
    ScanSection,
    ScanQuestion,
    ContextData,


    Test,
    Question,
    RubricPoint,
    Target,
    Student,
    StudentQuestionResult,
    StudentPointResult,

    total_requests
}