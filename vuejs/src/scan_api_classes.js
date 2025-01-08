import { getRandomID, delay, sum, apiRequest, downloadResultPdf } from '@/helpers';
import { globals } from '@/main'





var temp_saved_grade_data = {}



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
    set image(val){
        switch (this.selected_image_type) {
            case "raw":
                this.base64Image = val
                break;
            case "cropped":
                this.croppedImage = val
                break;
            case "colcor":
                this.colorCorrected = val
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
        console.log('colorCorrect: ',response)
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
        console.log('detectQrSections: ',response)

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
        console.log('unique_questions: ',unique_questions)
        const response = await Promise.all(unique_questions.map(async question_number => {
            const response = await apiRequest('/link_answer_sections', {
                sections: this.sections.filter(e => e.question_number == question_number).map(section => section.answer),
            })
            console.log('link answer: ',response)
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
        console.log('extractQuestion: ',response)
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
        console.log('extractText: ', response)
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


        this.saved_section_data = []
        this.saved_student_data = []
        this.saved_grade_data = {}
        this.saved_output = {
            questions: [],
            targets: []
        }
        this.loading = {
            pdf_data: false,
            structure: false,
            sections: false,
            students: false,
            grading: false,

        }
    }
    get is_loading(){
        return Object.values(this.loading).some(e => e)
    }
    get total_points(){
        return sum(this.questions.map(q => q.total_points))
    }
    get student_pdf_data(){
        return this.students.map(e => e.result_pdf_data)
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
    async loadTestStructure(use_preload=false){
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

        if (use_preload){

            var result = this.saved_output
        } else {


            var result = await apiRequest('/test-data', {
                requestText: request_text,
                testData: {
                    toets: test_data,
                    rubric: rubric_data
                }
            })
        }



        console.log('loadTestStructure: ', result)
        this.test_data_result = result
        this.loadTestData()
        this.loading.structure = false
    }
    loadTestData(){
        this.targets = []

        this.test_data_result.targets?.forEach(e => {
            this.addTarget(e)
        })
        this.questions = []

        this.test_data_result.questions?.forEach(e => {
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
        // const preload = []
        // await Promise.all(this.pages.map(async (page, index) => {
        for (let index = 0; index < this.pages.length;index++){

                
            if (use_preloaded){
                console.log(this.saved_section_data[index])
                this.pages[index].student_id = this.saved_section_data[index].student_id || ""

                this.pages[index].sections = this.saved_section_data[index].sections.map(e => {
                    return new ScanSection({
                        ...e,
                        student_id: this.pages[index].student_id
                    })
                })
            } else {
                await this.pages[index].detectStudentId()
                await this.pages[index].loadSections()
                preload.push({
                    student_id: this.pages[index].student_id,
                    sections: this.pages[index].sections
                })
                console.log('preload: ', preload)
            }
        }
        // }))


        this.loading.sections = false


    }
    async loadStudents(use_preload = false){
        this.loading.students = true

        if (use_preload){
            this.saved_student_data.forEach(student_data => {
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
                        scan: result?.scan?.base64Image,
                        student_handwriting_percent: result?.student_handwriting_percent

                    })
                    
                    question_result.resetPoints()

                    student.results.push(question_result)
                })

                this.students.push(student)

            })
            this.students.sort((a,b) => Number(a.student_id) - Number(b.student_id))
            this.loading.students = false

            return 

        } 
        const unique_student_ids = [...new Set(this.pages.map(e => e.student_id))].filter(e => e).sort((a,b) => Number(a) - Number(b))
        console.log(unique_student_ids)
        
        const test_context = this.test_context

        // await Promise.all(unique_student_ids.map(async student_id => {
        for (var student_id in unique_student_ids){
            var student_id = unique_student_ids[student_id]
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

                return {success: true, question_id: question.id, scan_question, student_handwriting_percent: response.student_handwriting_percent}
            }))

            const student = new Student({
                test:this, 
                student_id: student_id, 
            })

            scan_questions.forEach(scan_question => {
                
                const question_result = new StudentQuestionResult({
                    student: student,
                    question_id: scan_question.question_id,
                    scan: scan_question.success ? scan_question.scan_question : undefined,
                    student_handwriting_percent: scan_question.student_handwriting_percent
                })
                question_result.resetPoints()

                student.results.push(question_result)
            })
            console.log(student_id, student)

            const index = this.students.findIndex(e => e.student_id == student.student_id)
            if (index == -1){
                this.students.push(student)

            } else {
                this.students[index] = student
            }

        }
        // }))
        
        // print preload
        console.log(this.students.map(student => {
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

        this.loading.students = false
    }
    async gradeStudents(use_preload=false){
        this.loading.grading = true
        // await Promise.all(this.students.map(e => e.grade(use_preload)))
        for (let i = 0 ;i < this.students.length; i++) {
            await this.students[i].grade(use_preload)

        }
        this.loading.grading = false
    }
    async downloadStudentResults(feedback_field=false){
        await downloadResultPdf(this.student_pdf_data, feedback_field, 'AlleResultaten')
    }   
    async loadPreload(){
        const [
            saved_section_data, 
            saved_student_data, 
            saved_grade_data, 
            saved_output
        ] = await Promise.all([
            import('/src/saved_section_data2.json').then(module => module.default),
            import('/src/saved_student_data.json').then(module => module.default),
            import('/src/saved_grade_data.json').then(module => module.default),
            import('/src/saved_output.json').then(module => module.default),
        ])
        this.saved_section_data = saved_section_data
        this.saved_student_data = saved_student_data
        this.saved_grade_data = saved_grade_data
        this.saved_output = saved_output
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
    get total_points(){
        return sum(this.points.map(point => point.point_weight))
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
    get average_received_points(){
        return Math.round(sum(this.test.students.map(student => sum(student.results.map(q_result => sum(Object.values(q_result.point_results).filter(p_result => p_result.point.target_id == this.id).filter(p_result => p_result.has_point).map(p_result => p_result.point.point_weight)))))) / this.test.students.length * 1000) / 1000
    }
    get total_points(){
        return sum(this.test.questions.map(q => sum(q.points.filter(e => e.target_id == this.id).map(e => e.point_weight))))
    }
    get percent(){
        return (this.average_received_points/this.total_points * 100).toFixed(1) + '%'
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
    
    get target_results(){
        const target_results = {}
        this.test.targets.forEach(target => {
            var total_points = 0
            var received_points = 0
            
            this.test.questions.forEach(question => {
                question.points.forEach(point => {
                    if (point.target_id == target.id){
                        total_points += 1
                        
                        const question_result = this.results.find(e => e.question_id == question.id)
                        if (question_result){

                            const point_result = question_result.point_results[point.point_index]
                            if (point_result){
                                if (point_result.has_point){
                                    received_points += point.point_weight
                                }
                            }
                        }
                    }
                })
            })

            target_results[target.id] = {
                total_points: total_points,
                received_points: received_points,
                percent: (received_points/total_points * 100).toFixed(1) + '%',
                target: target,
            }
        })
        return target_results
    }
    get question_results(){
        const question_results = {}
        this.test.questions.forEach(question => {
            var total_points = 0
            var received_points = 0
            
            const result = this.results.find(e => e.question_id == question.id)
            if (result){
                question.points.forEach(point => {
                    total_points += 1
                    
                    const point_result = result.point_results[point.point_index]
                    if (point_result){
                        if (point_result.has_point){
                            received_points += point.point_weight
                        }
                    }
                })
            }


            question_results[question.id] = {
                total_points: total_points,
                received_points: received_points,
                percent: (received_points/total_points * 100).toFixed(1) + '%',
                result: result,
                question: question,
            }
        })
        return question_results
    }
    
    get received_points(){
        return sum(Object.values(this.question_results).map(e => e.received_points))
    }
    get result_pdf_data(){
        return {
            student_id: this.student_id,
            question_results: Object.values(this.question_results).map(question_result => {
                return {
                    question_number: question_result.question.question_number,
                    student_answer: question_result.result.scan.text,
                    feedback: question_result.result.feedback,
                    score: `${question_result.received_points} / ${question_result.total_points}`,
                    points: Object.values(question_result.result.point_results).map(point_result => {
                        return {
                            point_name: point_result.point.point_name,
                            points: point_result.has_point ? point_result.point.point_weight : 0,
                            feedback: point_result.feedback.length > 0 ? point_result.feedback : 'Geen feedback',
                        }
                    }),
                }
            }),
            targets: Object.values(this.target_results).map(target_result => {
                return {
                    target_name: target_result.target.target_name,
                    explanation: target_result.target.explanation,
                    score: `${target_result.received_points} / ${target_result.total_points}`,
                    percent: target_result.percent,
                }

            })
        }
    }
    async grade(use_preload=false){
        this.is_grading = true
        await Promise.all(this.results.map(async question_result => {
            await question_result.grade(use_preload)
        }))
        console.log('Temp: ', temp_saved_grade_data)


        this.is_grading = false
    }
    async downloadStudentResult(feedback_field = false){
        console.log('Starting download: ')
        await downloadResultPdf([this.result_pdf_data], feedback_field, 'LeerlingResultaat_'+this.student_id)
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
        is_grading=false,
        student_handwriting_percent=0
    }) {
        this.id = id
        this.student = student
        this.question_id = question_id
        this.feedback = feedback
        this.point_results = point_results
        this.scan = new ScanQuestion(scan)
        this.is_grading = is_grading
        this.student_handwriting_percent = student_handwriting_percent

    }
    get question(){
        return this.student.test.questions.find(e => e.id == this.question_id) || new Question({})
    }
    resetPoints(){
        this.point_results = {}
        this.question.points.forEach(point => {
            this.point_results[point.point_index] = new StudentPointResult({
                student_result: this,
                point_index: point.point_index
            })
        })
    }
    async grade(use_preload=false){
        this.is_grading = true

        if ((!this.question.is_draw_question && this.scan.text.length == 0)
            || (this.question.is_draw_question && this.scan.base64Image.length == 0)
        ) {
            console.log('No answer found for: student ', this.student.student_id, ' question: ', this.question.question_number)
            return
        }

        const context = this.student.test.test_context

        if (use_preload){
            if (this.student.test.saved_grade_data[this.student.student_id]?.[this.question.question_number]){
                var response =  this.student.test.saved_grade_data[this.student.student_id]?.[this.question.question_number]
            }
        } else {
            if (this.question.is_draw_question){
                var model = "gemini-2.0-flash-exp"
                var provider = "google"
            }

            var response = await apiRequest('/grade', {
                rubric: context.getRubric(this.question.question_number),
                question: context.getQuestion(this.question.question_number),
                answer: this.question.is_draw_question ? "" : this.scan.text,
                studentImage: this.question.is_draw_question ? this.scan.base64Image : undefined,
                model: model,
                provider: provider,
            })
            if (this.question.is_draw_question){

                await delay(5000)
            }


        }
        if (!use_preload){

            console.log('Graded: student ', this.student.student_id, '  question: ', this.question.question_number,':' , response)
        }
        if (response && response.result && response.result.points){
            var lowest_point_index = 0
            const sorted_points_indecies = response.result.points.map(e => e.point_index).sort((a,b) => a - b)
            if (sorted_points_indecies.length > 0){
                lowest_point_index = sorted_points_indecies[0]
            }

            if (!temp_saved_grade_data[this.student.student_id]){
                temp_saved_grade_data[this.student.student_id] = {}
            }
            temp_saved_grade_data[this.student.student_id][this.question.question_number] = response

            this.feedback = response.result.feedback
            response.result.points.forEach(response_point => {
                // const index = this.points.findIndex(point => point.point.point_index = response_point.point_index)
                if (this.point_results[response_point.point_index - lowest_point_index]){
                    this.point_results[response_point.point_index - lowest_point_index].has_point = response_point.has_point
                    this.point_results[response_point.point_index - lowest_point_index].feedback = response_point.feedback
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

}