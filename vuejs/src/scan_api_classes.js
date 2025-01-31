import { getRandomID, delay, sum, apiRequest, downloadResultPdf, downloadTest } from '@/helpers';
import { globals } from '@/main'





var temp_saved_grade_data = {}
var temp_section_data = []



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
                question_selector: e.question_selector_image,
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
        const base64_sections = this.sections.map(section => section.question_selector || "")

        const response = await apiRequest('/question_selector_info', {
            "base64Images": JSON.stringify(base64_sections),
            "checkbox_count": "7"
        })

        if (response.length != base64_sections.length){
            console.log('Page: ExtractQuestionLengthError: response: ', response.length, '- sections:', this.sections.length, response)
            this.loading.create_question = false
            return
        } else {
            console.log('Page: Extract question number result: ', response)

        }

        response.forEach((response_item, index) => {
            if (!!response_item.selected_checkbox && response_item.selected_checkbox > 0) {
                this.sections[index].question_number = response_item.selected_checkbox
                return
            }
            this.sections[index].question_number = 0
        })
        

        this.loading.create_question = false
    }
    async loadSections(extract_question=true){
        await this.detectSquares()
        await this.createSections()
        if (extract_question){

            await this.extractQuestions()
        }
        
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
    async extractQuestion(){
        const base64_sections = [this.question_selector]

        const response = await apiRequest('/question_selector_info', {
            "base64Images": JSON.stringify(base64_sections),
            "checkbox_count": "7"
        })

        if (response.length != base64_sections.length){
            console.log('Section: ExtractQuestionLengthError: response: ', response.length, '- sections:', this.sections.length, response)
            this.loading.create_question = false
            return
        } else {
            console.log('Section: Extract question number result: ', response)

        }

        if (response.length > 0){
            if (!!response[0].selected_checkbox && response[0].selected_checkbox > 0){

                this.question_number =  response[0].selected_checkbox
            } else {
                this.question_number = 0
            }
        }
        

    }

}


class GptQuestionSettings{
    constructor({
        test=null,
        id=getRandomID(),
        rtti="i",
        subject="motor",
        targets={},
        point_count=3

    }){
        this.test = test
        this.id = id
        this.rtti = rtti
        this.subject = subject
        this.targets = targets
        this.point_count = point_count
    }
    get selected_targets(){
        var selected_targets = this.test.targets.filter(target => this.targets[target.id])
        if (selected_targets.length == 0){
            selected_targets =this.test.targets
        }
        return selected_targets
    
    }
    get request_text(){
        return `
        Je moet een toets vraag gaan genereren op het juiste niveau.

        Dit is de informatie van de toets:
        School Type: ${this.test.gpt_test.school_type}
        School Jaar: ${this.test.gpt_test.school_year}
        Vak: ${this.test.gpt_test.school_subject}
        Onderwerp(en): ${this.test.gpt_test.subject}
        Geleerde stof: ${this.test.gpt_test.learned}
        Door de docent aangevraagde onderwerpen die op de toets komen: ${this.test.gpt_test.requested_topics}

        de vraag moet het volgdende rtti (de R staat voor Reproductie, de eerste T voor Training, de tweede T voor Transfer en de I voor Inzicht) hebben: 
        ${this.rtti}

        ${this.subject.length == 0 ? '' : `De vraag moet over het volgende onderwerp gaan: ${this.subject}`}

        Geef de vraag in het aangegeven schema
            vraag tekst: de exacte tekst van de vraag
            question_number: dit is het nummer van de vraag, oftewel vraagnummer.
            question_context: is de tekst die voor een vraag staat om de situatie te schetsen of de vraag in te leiden, dit is niet altijd nodig
            is_draw_question: geeft aan of het antwoord bij deze vraag het antwoord geen puur tekstantwoord is
            points: Haal uit de rubric bij elke vraag de rubric punten, als er geen punten in de rubric staan moet je zelf punten bedenken.
        elk punt heeft:
            een naam (point_name) met in 1 of 2 woorden waar die punt overgaat
            een tekst (point_text) met daarin de exacte uitleg van dit punt
            een nummber (point_index) welk punt dit is, bij deze vraag, start bij 0
            een gewicht (point_weight) voor hoeveel punten deze rubricpoint mee telt
            leerdoel (target_name) het leerdoel waar dit punt bij hoort, hieronder kan je zien welke namen je hier mag invullen
        
        hier zijn de leerdoelen die in de vraag/punten moeten voorkomen JE MAG GEEN ANDERE LEERDOEL NAMEN GEBRUIKEN, geef alleen de naam van het leerdoel (voor de ":"):
        ${this.selected_targets.map(e => `${e.target_name}: ${e.explanation}`).join('\n')}
        
        Dit zijn de vragen die al in de toets gestelt zijn, houdt hier rekening mee, zodat je niet 2x hetzelde vraagt:
        ${this.test.questions.map(e => `Vraag ${e.question_number}: ${e.question_text}`).join('\n')}

        Voor de vraag teksten mag je markdown gebruiken 
        Ook kan je dollar tekens gebruiken om latex equations te laten zien
        niewe regels ook toegestaan bij bijvoorbeeld meerkeuzevragen of een opsomming van dingen die een leerling moet beantwoorden.
        ook zijn nieuwe regels in de context toegestaan.

        De vraag mag maximaal ${this.point_count} punten hebben.

        geeft de resultaten in de taal van de gegeven toets(vaak zal dat Nederlands zijn)
        
        Houd je altijd aan het gegeven schema
        `
    }
}

class GptTestSettings{
    constructor({
        test=null,
        id=getRandomID(),
        school_type="vwo",
        school_year=3,
        school_subject="Scheikunde",
        subject="Verbranding",
        learned="",
        requested_topics="",
    }){
        this.test = test
        this.id = id
        this.school_type = school_type
        this.school_year = school_year
        this.school_subject = school_subject
        this.subject = subject
        this.learned = learned
        this.requested_topics = requested_topics
    }
    get request_text(){
        return `
        Je moet een toets gaan genereren op het juiste niveau.
        School Type: ${this.school_type}
        School Jaar: ${this.school_year}
        Vak: ${this.school_subject}
        Onderwerp(en): ${this.subject}

        Nu krijg je wat informatie over wat er in de toets moet komen en wat je de leerlingen kan vragen.
        Geleerde stof: ${this.learned}
        Door de docent aangevraagde onderwerpen die op de toets komen: ${this.requested_topics}

        Geef de vragen in het aangegeven schema
            vraag tekstQ: de exacte tekst van de vraag
            question_number: dit is het nummer van de vraag, oftewel vraagnummer.
            question_context: is de tekst die voor een vraag staat om de situatie te schetsen of de vraag in te leiden, dit is niet altijd nodig
            is_draw_question: geeft aan of het antwoord bij deze vraag het antwoord geen puur tekstantwoord is
            points: Haal uit de rubric bij elke vraag de rubric punten, als er geen punten in de rubric staan moet je zelf punten bedenken.
        een vraag heeft 1-3 punten en elk punt heeft:
            een naam (point_name) met in 1 of 2 woorden waar die punt overgaat
            een tekst (point_text) met daarin de exacte uitleg van dit punt
            een nummber (point_index) welk punt dit is, bij deze vraag, start bij 0
            een gewicht (point_weight) voor hoeveel punten deze rubricpoint mee telt
            leerdoel (target_name) het leerdoel waar dit punt bij hoort
        
        Daarmaast moet je bij de hele toets een paar overkoepelende leerdoelen bedenken.
        Elk leerdoel heeft een korte naam: dit is ook de naam die bij elk punt waar dit leerdoel het meest bij hoort wordt ingevuld
        en een uitleg (explanation) met daarin exact wat dit leerdoel inhoud.

        Voor de vraag teksten mag je markdown gebruiken 
        Ook kan je dollar tekens gebruiken om latex equations te laten zien
        niewe regels ook toegestaan bij bijvoorbeeld meerkeuzevragen of een opsomming van dingen die een leerling moet beantwoorden.
        ook zijn nieuwe regels in de context toegestaan.

        geeft de resultaten in de taal van de gegeven toets(vaak zal dat Nederlands zijn)
        
        Houd je altijd aan het gegeven schema

        `
    }
}

class TestPdfSettings {
    constructor({
        test_name="",
        show_targets=true,
        show_answers=false,
        output_type='pdf'
    }){
        this.test_name = test_name
        this.show_targets = show_targets
        this.show_answers = show_answers
        this.output_type = output_type
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
        gpt_test=new GptTestSettings({}),
        gpt_question=new GptQuestionSettings({}),
        test_settings=new TestPdfSettings({}),

        gpt_provider="google",
        gpt_model="gemini-2.0-flash-exp",
    }){
        this.id = id
        this.files = files

        this.pages = pages

        this.questions = questions.map(e => new Question({test: this, ...e}))
        this.students = students.map(e => new Student({test: this, ...e}))
        this.targets = targets.map(e => new Target({test: this, ...e}))
        this.test_data_result=test_data_result

        this.test_settings = test_settings


        this.saved_section_data = []
        this.saved_student_data = []
        this.saved_grade_data = {}
        this.saved_output = {
            questions: [],
            targets: []
        }
        this.gpt_test = gpt_test
        this.gpt_test.test = this
        this.gpt_question = gpt_question
        this.gpt_question.test = this
        this.loading = {
            pdf_data: false,
            structure: false,
            sections: false,
            students: false,
            grading: false,
            test_pdf: false

        }
        this.output_type = output_type

        this.gpt_provider = gpt_provider
        this.gpt_model = gpt_model
    }
    get providerModels(){
        return  {
            "google": ["gemini-2.0-flash-exp", "gemini-1.5-pro", "learnlm-1.5-pro-experimental", "gemini-exp-1206"],
            "openai": ["gpt-4o-mini", "gpt-4o"],
            "deepseek": ["deepseek-chat", "deepseek-reasoner"],
            "alibaba": ["qwen-turbo", "qwen-plus", "qwen-max-2025-01-25", "qwen-max"]
        }
    }
    get total_model_count(){
        return sum(Object.values(this.providerModels).map(e => e.length))
    }
    get gpt_models(){
        if (this.gpt_provider == "google"){
            return ["gemini-2.0-flash-exp", "gemini-1.5-pro", "learnlm-1.5-pro-experimental", "gemini-exp-1206"]
        } else if (this.gpt_provider == "openai"){
            return ["gpt-4o-mini", "gpt-4o"]
        } else if (this.gpt_provider == "deepseek"){
            return ["deepseek-chat", "deepseek-reasoner"]
        } else if (this.gpt_provider == "alibaba") {
            return ["qwen-turbo", "qwen-plus", "qwen-max-2025-01-25", "qwen-max", ]
        }else {
            return []
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
    setQuestionNumbers(){
        this.questions.forEach((question, index) => {
            question.question_number = (index + 1).toString()
        })
    }
    async loadDataFromPdf(field_type){
        this.loading.pdf_data = true
        console.log(field_type)
        if (["rubric", "test"].includes(field_type)) {
            this.files[field_type].data = await globals.$extractTextAndImages(this.files[field_type].raw)

        } else if (["load_pages", "students"].includes(field_type)){
            this.students.data = await globals.$pdfToBase64Images(this.files["students"].raw)

            this.students.data.forEach(page => {
                this.addPage(page)
            })
        }
        this.loading.pdf_data = false
    }
    async generateGptTest(){
        this.loading.structure = true
        const request_text = this.gpt_test.request_text

        
        try {
            
            var result = await apiRequest('/gpt-test', {
                requestText: request_text,
                model: this.gpt_model,
                provider: this.gpt_provider
            })
            console.log(result)
        } catch (error) {
            console.log(error)
            this.loading.structure = false

            return 
        }

        // var result = {result: {
        //     "questions": [
        //         {
        //             "is_draw_question": false,
        //             "points": [
        //                 {
        //                     "has_point": true,
        //                     "point_index": 0,
        //                     "point_name": "Formule opstellen",
        //                     "point_text": "De leerling kan de juiste formule opstellen.",
        //                     "point_weight": 1,
        //                     "target_name": "Formulegebruik"
        //                 },
        //                 {
        //                     "has_point": true,
        //                     "point_index": 1,
        //                     "point_name": "Sinus toepassen",
        //                     "point_text": "De leerling past de sinus correct toe in de formule.",
        //                     "point_weight": 1,
        //                     "target_name": "Wiskundige vaardigheden"
        //                 },
        //                 {
        //                     "has_point": true,
        //                     "point_index": 2,
        //                     "point_name": "Eenheden",
        //                     "point_text": "De leerling gebruikt de juiste eenheden.",
        //                     "point_weight": 1,
        //                     "target_name": "Eenheden"
        //                 }
        //             ],
        //             "question_context": "Een massa hangt aan een veer. De uitwijking $u$ van de massa ten opzichte van de evenwichtsstand wordt gegeven door de formule: $u = A \\cdot \\sin(2\\pi ft)$",
        //             "question_number": "1",
        //             "question_text": "De amplitude $A$ is 0,1 m, de frequentie $f$ is 2 Hz en de tijd $t$ is 0,5 s. Bereken de uitwijking $u$."
        //         },
        //         {
        //             "is_draw_question": false,
        //             "points": [
        //                 {
        //                     "has_point": true,
        //                     "point_index": 0,
        //                     "point_name": "Formule opstellen",
        //                     "point_text": "De leerling kan de juiste formule opstellen.",
        //                     "point_weight": 1,
        //                     "target_name": "Formulegebruik"
        //                 },
        //                 {
        //                     "has_point": true,
        //                     "point_index": 1,
        //                     "point_name": "Wortel toepassen",
        //                     "point_text": "De leerling past de wortel correct toe in de formule.",
        //                     "point_weight": 1,
        //                     "target_name": "Wiskundige vaardigheden"
        //                 },
        //                 {
        //                     "has_point": true,
        //                     "point_index": 2,
        //                     "point_name": "Eenheden",
        //                     "point_text": "De leerling gebruikt de juiste eenheden.",
        //                     "point_weight": 1,
        //                     "target_name": "Eenheden"
        //                 }
        //             ],
        //             "question_context": "De snelheid $v$ van een golf in een snaar wordt gegeven door de formule: $v = \\sqrt{\\frac{F}{\\mu}}$",
        //             "question_number": "2",
        //             "question_text": "De spankracht $F$ in de snaar is 100 N en de massa per lengte-eenheid $\\mu$ is 0,1 kg/m. Bereken de snelheid $v$ van de golf."
        //         },
        //         {
        //             "is_draw_question": false,
        //             "points": [
        //                 {
        //                     "has_point": true,
        //                     "point_index": 0,
        //                     "point_name": "Tabel lezen",
        //                     "point_text": "De leerling kan de juiste waarden uit de tabel aflezen.",
        //                     "point_weight": 1,
        //                     "target_name": "Tabellen"
        //                 },
        //                 {
        //                     "has_point": true,
        //                     "point_index": 1,
        //                     "point_name": "Formule toepassen",
        //                     "point_text": "De leerling past de formule correct toe.",
        //                     "point_weight": 1,
        //                     "target_name": "Formulegebruik"
        //                 }
        //             ],
        //             "question_context": "In de tabel hieronder staan de waarden voor de sinus van een aantal hoeken.\n\n| Hoek (graden) | sin(hoek) |\n|---|---|\n| 0 | 0 |\n| 30 | 0,5 |\n| 45 | 0,71 |\n| 60 | 0,87 |\n| 90 | 1 |\n\nDe uitwijking $u$ van een trillend voorwerp wordt gegeven door de formule $u = A \\cdot \\sin(\\alpha)$, waarbij $A$ de amplitude is en $\\alpha$ de hoek in graden.",
        //             "question_number": "3",
        //             "question_text": "De amplitude $A$ is 5 cm. Wat is de uitwijking $u$ bij een hoek van 30 graden?"
        //         }
        //     ],
        //     "targets": [
        //         {
        //             "explanation": "De leerling kan formules met sinussen en wortels toepassen in verschillende contexten.",
        //             "target_name": "Formulegebruik"
        //         },
        //         {
        //             "explanation": "De leerling kan wiskundige bewerkingen zoals het berekenen van een sinus en een wortel correct uitvoeren.",
        //             "target_name": "Wiskundige vaardigheden"
        //         },
        //         {
        //             "explanation": "De leerling kan de juiste eenheden gebruiken bij het toepassen van formules.",
        //             "target_name": "Eenheden"
        //         },
        //         {
        //             "explanation": "De leerling kan informatie uit tabellen aflezen en gebruiken in berekeningen.",
        //             "target_name": "Tabellen"
        //         }
        //     ]
        // }}

        if(!result.result){
            this.loading.structure = false

            return
        } 
        

        this.test_data_result = result.result
        this.loadTestData()
        console.log('loadTestStructure: ', result, '\n Test: ', this)
        this.loading.structure = false
    }
    async generateGptQuestion(){
        this.loading.structure = true
        const request_text = this.gpt_question.request_text

        
        try {

            var result = await apiRequest('/gpt-test-question', {
                requestText: request_text,
                model: this.gpt_model,
                provider: this.gpt_provider
            })
            console.log(result)

        } catch (error) {
            console.log(error)
            this.loading.structure = false

            return 
        }

    //     var result = {result: {
    // "questions": [
    //     {
    //         "is_draw_question": false,
    //         "points": [
    //             {
    //                 "has_point": true,
    //                 "point_index": 0,
    //                 "point_name": "Reactanten",
    //                 "point_text": "Methaan en zuurstof staan voor de pijl",
    //                 "point_weight": 1,
    //                 "target_name": "Reactievergelijkingen"
    //             },
    //             {
    //                 "has_point": true,
    //                 "point_index": 1,
    //                 "point_name": "Producten",
    //                 "point_text": "Koolstofdioxide en water staan na de pijl",
    //                 "point_weight": 1,
    //                 "target_name": "Reactievergelijkingen"
    //             },
    //             {
    //                 "has_point": true,
    //                 "point_index": 2,
    //                 "point_name": "Kloppend",
    //                 "point_text": "De reactievergelijking is kloppend gemaakt",
    //                 "point_weight": 1,
    //                 "target_name": "Reactievergelijkingen"
    //             }
    //         ],
    //         "question_context": "Bij een volledige verbranding van een brandstof reageert de brandstof met zuurstof. Hierbij ontstaan een of meerdere verbrandingsproducten.",
    //         "question_number": "1",
    //         "question_text": "Wat is de reactievergelijking van de volledige verbranding van methaan (CH4)?"
    //     },
    //     {
    //         "is_draw_question": false,
    //         "points": [
    //             {
    //                 "has_point": true,
    //                 "point_index": 0,
    //                 "point_name": "Antwoord",
    //                 "point_text": "Koolstofmono-oxide of roet",
    //                 "point_weight": 1,
    //                 "target_name": "Volledige en onvolledige verbranding"
    //             }
    //         ],
    //         "question_context": "Bij een onvolledige verbranding is er te weinig zuurstof aanwezig voor een volledige verbranding.",
    //         "question_number": "2",
    //         "question_text": "Welke stof kan er ontstaan bij een onvolledige verbranding die niet ontstaat bij een volledige verbranding?"
    //     },
    //     {
    //         "is_draw_question": false,
    //         "points": [
    //             {
    //                 "has_point": true,
    //                 "point_index": 0,
    //                 "point_name": "Nadeel 1",
    //                 "point_text": "Bij verbranding komt CO2 vrij, wat bijdraagt aan het versterkte broeikaseffect",
    //                 "point_weight": 1,
    //                 "target_name": "Fossiele brandstoffen"
    //             },
    //             {
    //                 "has_point": true,
    //                 "point_index": 1,
    //                 "point_name": "Nadeel 2",
    //                 "point_text": "Fossiele brandstoffen raken op",
    //                 "point_weight": 1,
    //                 "target_name": "Fossiele brandstoffen"
    //             }
    //         ],
    //         "question_context": "Aardgas is een fossiele brandstof die veel gebruikt wordt in huishoudens.",
    //         "question_number": "3",
    //         "question_text": "Noem twee nadelen van het gebruik van fossiele brandstoffen."
    //     },
    //     {
    //         "is_draw_question": false,
    //         "points": [
    //             {
    //                 "has_point": true,
    //                 "point_index": 0,
    //                 "point_name": "Zuurstof",
    //                 "point_text": "De hoeveelheid zuurstof in de ruimte neemt af",
    //                 "point_weight": 1,
    //                 "target_name": "Volledige en onvolledige verbranding"
    //             },
    //             {
    //                 "has_point": true,
    //                 "point_index": 1,
    //                 "point_name": "Verbranding",
    //                 "point_text": "De verbranding wordt onvollediger",
    //                 "point_weight": 1,
    //                 "target_name": "Volledige en onvolledige verbranding"
    //             },
    //             {
    //                 "has_point": true,
    //                 "point_index": 2,
    //                 "point_name": "Vlam",
    //                 "point_text": "De vlam wordt kleiner en zal uiteindelijk doven",
    //                 "point_weight": 1,
    //                 "target_name": "Volledige en onvolledige verbranding"
    //             }
    //         ],
    //         "question_context": "Een kaars brandt in een afgesloten ruimte.",
    //         "question_number": "4",
    //         "question_text": "Leg uit wat er gebeurt met de vlam van de kaars naarmate de tijd verstrijkt."
    //     }
    // ],
    // "targets": [
    //     {
    //         "explanation": "De leerling kan reactievergelijkingen van verbrandingsreacties opstellen en kloppend maken.",
    //         "target_name": "Reactievergelijkingen"
    //     },
    //     {
    //         "explanation": "De leerling begrijpt het verschil tussen volledige en onvolledige verbranding en kan de reactieproducten benoemen.",
    //         "target_name": "Volledige en onvolledige verbranding"
    //     },
    //     {
    //         "explanation": "De leerling kent de nadelen van het gebruik van fossiele brandstoffen.",
    //         "target_name": "Fossiele brandstoffen"
    //     }
    // ]
    //     }}

        if(!result.result){
            this.loading.structure = false

            return
        } 
        

        this.addQuestion(result.result)
        console.log('loadTestQuestion: ', result, '\n Test: ', this)
        this.loading.structure = false
    }
    async loadTestStructure(use_preload=false){
        this.loading.structure = true
        const request_text = `
        Je krijg een toets en de antwoorden. Jouw taak is om die zo goed en precies mogelijk in een digitaal formaat om te zetten.
        je hoeft niets te doen met de context om een vraag. Het gaat alleen om de vraag zelf
        Extraheer uit de teksten de vragen:
            vraag tekst: de exacte tekst van de vraag
            question_context: tekst die voor een vraag staat, het is niet altijd nodig
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

            var result = {result: this.saved_output}
        } else {


            var result = await apiRequest('/test-data', {
                requestText: request_text,
                testData: {
                    toets: test_data,
                    rubric: rubric_data
                }
            })
        }

        if(!result.result){
            return
        } 
        

        this.test_data_result = result.result


        console.log('loadTestStructure: ', result)
        this.loadTestData()
        this.loading.structure = false
    }
    async downloadTest(){
        this.loading.test_pdf = true

        const test_data = {
            questions: [],
            targets: [],
            settings: this.test_settings
        }

        this.questions.forEach(question => {
            test_data.questions.push({
                question_number: question.question_number,
                question_text: question.question_text,
                question_context: question.question_context,
                answer_text: question.answer_text,
                points: question.points.map(point => {
                    return {
                        point_name: point.point_name,
                        point_text: point.point_text,
                        point_index: point.point_index,
                        point_weight: point.point_weight,
                        target_name: point.target_name
                    }
                }),
            })
        })
        this.targets.forEach(target => {
            test_data.targets.push({
                target_name: target.target_name,
                explanation: target.explanation
            })
        })

        await downloadTest(test_data)
        console.log(test_data)
        this.loading.test_pdf = false

    }
    loadTestData(){
        this.targets = []

        this.test_data_result.targets?.forEach(e => {
            this.addTarget(e)
        })
        console.log(this.test_data_result)
        this.questions = []

        this.test_data_result.questions?.forEach((e, index) => {
            if (!e.question_number){
                e.question_number = (index + 1).toString()
            }
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
    async loadStudentIds(){
        await Promise.all(this.pages.map(async (page, index) => {
            return this.pages[index].detectStudentId()
        }))
    }
    async loadSections(){
        await Promise.all(this.pages.map(async (page, index) => {
            return this.pages[index].loadSections(false)
        }))


        const base64_sections = this.pages.map(page => page.sections.map(section => section.question_selector || "")).flat(Infinity)

        const response = await apiRequest('/question_selector_info', {
            "base64Images": JSON.stringify(base64_sections),
            "checkbox_count": "7"
        })

        if (response.length != base64_sections.length){
            console.log('Page: ExtractQuestionLengthError: response: ', response.length, '- sections:', this.sections.length, response)
            this.loading.create_question = false
            return
        } else {
            console.log('Page: Extract question number result: ', response)

        }
        var image_index = -1
        for (let index = 0; index < this.pages.length;index++){
            for (let section_index = 0; section_index < this.pages[index].sections.length; section_index++){
                image_index += 1
                if (!!response[image_index].selected_checkbox && response[image_index].selected_checkbox > 0) {
                    this.pages[index].sections[section_index].question_number = response[image_index].selected_checkbox
                    return
                }
                this.pages[index].sections[section_index].question_number = 0
                
            }
        }

        
    }
    
    async scanStudentIdsAndSections(use_preloaded = false){
        this.loading.sections = true
        // const preload = []
        // await Promise.all(this.pages.map(async (page, index) => {
        if (!use_preloaded){

            await this.loadStudentIds()
            

            await this.loadSections()
        }
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
                // temp_section_data.push({
                //     student_id: this.pages[index].student_id,
                //     sections: this.pages[index].sections
                // })
                // console.log('preload: ', temp_section_data)
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
        question_context="",
        answer_text="",
        is_draw_question=false,
        points=[],
    }){
        this.test = test
        this.is_draw_question = is_draw_question
        this.id = id
        this.question_number = question_number
        this.question_context = question_context
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
            // if (this.question.is_draw_question){
            //     var model = "gemini-2.0-flash-exp"
            //     var provider = "google"
            // }

            

            var response = await apiRequest('/grade', {
                rubric: context.getRubric(this.question.question_number),
                question: context.getQuestion(this.question.question_number),
                answer: this.question.is_draw_question ? "" : this.scan.text,
                studentImage: this.question.is_draw_question ? this.scan.base64Image : undefined,
                model: this.gpt_model,
                provider: this.gpt_provider,
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