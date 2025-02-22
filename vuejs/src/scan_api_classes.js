// --- START OF FILE scan_api_classes.js ---
import {
    getRandomID,
    delay,
    sum,
    apiRequest,
    downloadResultPdf,
    downloadTest
} from '@/helpers';
import {
    uploadFile,
    deleteFile
} from '@/helpers/gcp_storage'; // Import GCP storage functions
import {
    globals
} from '@/main'
import {
    useUserStore
} from '@/stores/user_store'; // Import user store

var temp_saved_grade_data = {}
var temp_section_data = []

class File {
    constructor({
        id = getRandomID(),
        test_id = null,
        student_question_result_id = null,
        location = null,
        file_type = null,
        base64Data = null, // Only used temporarily
        is_stored = false
    }) {
        this.id = id;
        this.test_id = test_id
        this.student_question_result_id = student_question_result_id
        this.location = location;
        this.file_type = file_type;
        this.base64Data = base64Data;
        this.is_stored = is_stored
    }

    get url() {
        // Return base64 data URL if not stored, otherwise return cloud storage URL
        return this.is_stored ?
            this.location :
            this.base64Data;
    }

    async store(test_id = null, student_question_result_id = null) {
        if (this.is_stored) {
            console.warn("File already stored.");
            return;
        }
        if (!this.base64Data) {
            console.error("No base64 data to store.");
            return;
        }

        try {
            // Determine file path based on whether it's test-level or student-level
            const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
            const baseFileName = `${this.id}_${timestamp}`;
            let filePath = '';

            if (student_question_result_id) {
                // Student-specific file (e.g., answer image)
                filePath = `student_answers/${student_question_result_id}/${baseFileName}.${this.file_type}`;

            } else if (test_id) {
                // Test-level file (e.g., test PDF, rubric PDF)
                filePath = `tests/${test_id}/${baseFileName}.${this.file_type}`;
            } else {
                console.error("test_id or student_question_result_id must be provided for file storage.");
                return;
            }


            // Extract base64 content type and data
            const matches = this.base64Data.match(/^data:(.+);base64,(.+)$/);
            if (!matches || matches.length !== 3) {
                throw new Error("Invalid base64 data format.");
            }
            const contentType = matches[1];
            const base64Content = matches[2];
            const buffer = Buffer.from(base64Content, 'base64');

            this.location = await uploadFile(filePath, buffer, contentType);
            this.is_stored = true;
            this.base64Data = null; // Clear base64 data after storing
            this.test_id = test_id
            this.student_question_result_id = student_question_result_id
            //insert this file into supabase
            console.log('STORED: ', filePath, '   location: ', this.location)

        } catch (error) {
            console.error("Failed to store file:", error);
            throw error; // Re-throw for handling in calling function.
        }
    }
    async deleteFromStorage() {
        if (!this.is_stored || !this.location) {
            console.warn("File not stored or no location specified.");
            return;
        }

        try {
            // Extract the file path from the full URL.  This assumes the URL format
            // is consistent with what `uploadFile` returns.
            const urlParts = this.location.split('/');
            const filePath = urlParts.slice(urlParts.indexOf(config.gcp.bucketName) + 1).join('/');

            await deleteFile(filePath);
            this.is_stored = false;
            this.location = null;
        } catch (error) {
            console.error("Failed to delete file:", error);
            throw error;
        }
    }
}



class ContextData {
    constructor({
        contexts = {},
        questions = {},
        rubrics = {},
    }) {
        this.contexts = contexts
        this.questions = questions
        this.rubrics = rubrics
    }
    getQuestion(id) {
        return this.questions[id] || ""
    }
    getRubric(id) {
        return this.rubrics[id] || ""
    }
    getContext(id) {
        return this.contexts[id] || ""
    }
}


class ScanPage {
    constructor(file, context_data = new ContextData({})) {
        this.file = new File({
            ...file,
            file_type: 'jpeg'
        });
        this.id = getRandomID()

        this.student_id = null;
        this.base64_color_corrected = null;
        this.base64_red_pen_extracted = null;
        this.base64_cropped_image = null;
        this.base64_square_image = null;
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
    get is_loading() {
        return Object.values(this.loading).some(e => e)
    }
    get image() {
        switch (this.selected_image_type) {
            case "raw":
                return this.file.base64Data
                break;
            case "cropped":
                return this.base64_cropped_image
                break;
            case "colcor":
                return this.base64_color_corrected
                break;
            default:
                break;
        }

    }
    set image(val) {
        switch (this.selected_image_type) {
            case "raw":
                this.file.base64Data = val
                break;
            case "cropped":
                this.base64_cropped_image = val
                break;
            case "colcor":
                this.base64_color_corrected = val
                break;
            default:
                break;
        }

    }
    get image_options() {
        const options = ['raw']
        if (this.base64_cropped_image) {
            options.push('cropped')
        }
        if (this.base64_color_corrected) {
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
                Base64Image: this.file.base64Data
            });
            if (response) {
                this.selected_image_type = 'cropped'
                this.base64_cropped_image = response;
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
        console.log('colorCorrect: ', response)
        this.base64_color_corrected = response.clean;
        this.loading.col_cor = false
        this.selected_image_type = 'colcor'
        return this.base64_color_corrected;
    }

    async detectQrSections() {
        this.loading.detect_qr = true
        const response = await apiRequest('/get_qr_sections', {
            Base64Image: this.image,
        });
        this.base64_square_image = response?.image || null
        response?.sections?.forEach(e => {
            const section = new ScanSection({
                full: {
                    base64Data: e.section_image
                },
                question_selector: {
                    base64Data: e.base64_question_selector_image
                },
                answer: {
                    base64Data: e.section_image
                },
                question_number: e.data,
                is_qr_section: true
            })

            this.sections.push(section)
        });
        console.log('detectQrSections: ', response)

        this.loading.detect_qr = false
        return this.base64_color_corrected;
    }
    async detectStudentId() {
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
        this.base64_square_image = response?.image || ""
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

        if (this.total_result) {
            this.loadPageDataFromTotal(this.total_result)

        }
        this.loading.all = false
        return this.total_result;
    }

    loadPageDataFromTotal(total) {
        if (!total) {
            return null
        }

        this.student_id = total.student_id_data?.result.text || ""
        this.base64_red_pen_extracted = total.red_pen_base64 || ""
        this.base64_cropped_image = total.cropped_base64 || ""
        total.questions.forEach(q => {
            const question = new ScanQuestion({
                file: {
                    base64Data: q.image
                }
            })
            question.file.base64Data = q.image
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
        if (response?.sections) {

            this.sections = response.sections.map(section => new ScanSection({
                full: {
                    base64Data: section.base64_full
                },
                section_finder: {
                    base64Data: section.base64_section_finder
                },
                question_selector: {
                    base64Data: section.base64_question_selector
                },
                answer: {
                    base64Data: section.base64_answer
                },
                student_id: this.student_id
            }));
        }
        this.loading.create_sections = false
    }

    // Extract text from sections, turning them into Question objects if they match the criteria
    async extractQuestions() {
        this.loading.create_question = true
        const base64_sections = this.sections.map(section => section.file_question_selector.base64Data || "")

        const response = await apiRequest('/question_selector_info', {
            "base64Images": JSON.stringify(base64_sections),
            "checkbox_count": "7"
        })

        if (response.length != base64_sections.length) {
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
    async loadSections(extract_question = true) {
        await this.detectSquares()
        await this.createSections()
        if (extract_question) {

            await this.extractQuestions()
        }

    }

    // Link with other answer sections
    async linkAnswers() {
        this.is_loading = true
        const unique_questions = [...new Set(this.sections.map(e => e.question_number))].filter(e => e != 0)
        console.log('unique_questions: ', unique_questions)
        const response = await Promise.all(unique_questions.map(async question_number => {
            const response = await apiRequest('/link_answer_sections', {
                sections: this.sections.filter(e => e.question_number == question_number).map(section => section.file_answer.base64Data),
            })
            console.log('link answer: ', response)
            return {
                response,
                question_number
            }
        }))
        this.questions = response.map(e => new ScanQuestion({
            file: {
                base64Data: e.response
            },
            question_number: e.question_number,
            page: this
        }))

        this.is_loading = false
    }
    async extractText() {
        this.is_loading = true
        await Promise.all(this.questions.map(question => question.extractText()))
        this.is_loading = false
    }

}


class ScanSection {
    constructor({
        full = {
            base64Data: null
        },
        section_finder = {
            base64Data: null
        },
        question_selector = {
            base64Data: null
        },
        answer = {
            base64Data: null
        },
        question_number = null,
        question_number_data = null,
        is_qr_section = false,
        student_id = null
    }) {
        this.id = getRandomID()
        this.is_loading = false

        this.file_full = new File({
            ...full,
            file_type: 'jpeg'
        });
        this.file_section_finder = new File({
            ...section_finder,
            file_type: 'jpeg'
        });
        this.file_question_selector = new File({
            ...question_selector,
            file_type: 'jpeg'
        });
        this.file_answer = new File({
            ...answer,
            file_type: 'jpeg'
        });

        this.is_qr_section = is_qr_section
        this.student_id = student_id
        this.question_number = question_number
        this.question_number_data = question_number_data
    }

    async extractQuestion() {
        this.is_loading = true
        const response = await apiRequest('/question_selector_info', {
            Base64Image: this.file_question_selector.base64Data,
        });
        console.log('extractQuestion: ', response)
        this.question_number = response.most_certain_checked_number || 0;
        this.question_number_data = response
        this.is_loading = false
        return response
    }


}
class ScanQuestion {
    constructor({
        file = {
            base64Data: ""
        },
        question_number = "",
        text = "",
        data = {},
        page = new ScanPage({
            file: {
                base64Data: ""
            }
        }),
        is_loading = false
    }) {
        this.id = getRandomID()

        this.file = new File({
            ...file,
            file_type: 'jpeg'
        });
        this.question_number = question_number
        this.text = text
        this.data = data
        this.page = page
        this.is_loading = is_loading
    }


    // Extract text from the section based on the bounding box
    async extractText(context = null, provider = null, model = null) {
        this.is_loading = true

        if (!context) {
            context = this.page.context_data
        }

        const response = await apiRequest('/extract_text', {
            Base64Image: this.file.base64Data,
            questionText: context.getQuestion(this.question_number.toString()),
            rubricText: context.getQuestion(this.question_number.toString()),
            contextText: context.getContext(this.question_number.toString()),
            provider: provider,
            model: model,
        });
        console.log('extractText: ', response)
        this.text = response.result?.correctly_spelled_text || "";
        this.data = response
        this.is_loading = false
        return {
            text: this.text
        };
    }
    async extractQuestion() {
        const base64_sections = [this.file_question_selector.base64Data]

        const response = await apiRequest('/question_selector_info', {
            "base64Images": JSON.stringify(base64_sections),
            "checkbox_count": "7"
        })

        if (response.length != base64_sections.length) {
            console.log('Section: ExtractQuestionLengthError: response: ', response.length, '- sections:', this.sections.length, response)
            this.loading.create_question = false
            return
        } else {
            console.log('Section: Extract question number result: ', response)

        }

        if (response.length > 0) {
            if (!!response[0].selected_checkbox && response[0].selected_checkbox > 0) {

                this.question_number = response[0].selected_checkbox
            } else {
                this.question_number = 0
            }
        }


    }

}


class GptQuestionSettings {
    constructor({
        test = null,
        id = getRandomID(),
        rtti = "i",
        subject = "motor",
        targets = {},
        point_count = 3

    }) {
        this.test = test
        this.id = id
        this.rtti = rtti
        this.subject = subject
        this.targets = targets
        this.point_count = point_count
    }
    get selected_targets() {
        var selected_targets = this.test.targets.filter(target => this.targets[target.id])
        if (selected_targets.length == 0) {
            selected_targets = this.test.targets
        }
        return selected_targets

    }
    get request_text() {
        return `
                Je moet een toets vraag gaan genereren op het juiste niveau.

                Dit is de informatie van de toets:
                School Type: ${this.test.gpt_test.school_type}
                School Jaar: ${this.test.gpt_test.school_year}
                Vak: ${this.test.gpt_test.school_subject}
                ${this.test.gpt_test.subject?.length > 0 ? 'Onderwerp(en):  '+this.test.gpt_test.subject : 'Bedenk zelf de onderwerpen'}
                ${this.test.gpt_test.learned?.length > 0 ? 'Geleerde stof:  '+this.test.gpt_test.learned : ''}
                ${this.test.gpt_test.requested_topics?.length > 0 ? 'Door de docent aangevraagde informatie over de toets: '+this.test.gpt_test.requested_topics : ''}
                

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

class GptTestSettings {
    constructor({
        test = null,
        id = getRandomID(),
        school_type = "vwo",
        school_year = 3,
        school_subject = "Scheikunde",
        subject = "Verbranding",
        learned = "",
        requested_topics = "",
    }) {
        this.test = test
        this.id = id
        this.school_type = school_type
        this.school_year = school_year
        this.school_subject = school_subject
        this.subject = subject
        this.learned = learned
        this.requested_topics = requested_topics
    }
    get request_text() {
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

                De punten moeten heel duidelijk beschrijven wat een leerling precies moet hebben gedaan om het punt te verdienen. 
                Er mag geen twijfel over mogelijk zijn.
                Zet er zo nodig uitzonderingen bij

                geeft de resultaten in de taal van de gegeven toets(vaak zal dat Nederlands zijn)
                
                Houd je altijd aan het gegeven schema

                `
    }
}

class TestPdfSettings {
    constructor({
        test_name = "",
        show_targets = true,
        show_answers = false,
        output_type = 'docx'
    }) {
        this.test_name = test_name
        this.show_targets = show_targets
        this.show_answers = show_answers
        this.output_type = output_type
    }

}

class Test {
    constructor({
        id = getRandomID(),
        user_id = null,
        files = {
            test: {
                raw: null,
                data: [],
            },
            rubric: {
                raw: null,
                data: [],
            },
            students: {
                raw: null,
                data: [],
            },
        },
        questions = [],
        students = [],
        targets = [],
        pages = [],

        test_data_result = null,
        gpt_test = new GptTestSettings({}),
        gpt_question = new GptQuestionSettings({}),
        test_settings = new TestPdfSettings({}),

        gpt_provider = "google",
        gpt_model = "gemini-2.0-flash",
        grade_rules = "",
    }) {
        this.id = id
        this.user_id = user_id;
        this.files = {
            test: new File({
                ...files.test,
                file_type: 'pdf'
            }), // Use File class
            rubric: new File({
                ...files.rubric,
                file_type: 'pdf'
            }), // Use File class
            students: new File({
                ...files.students,
                file_type: 'pdf'
            }), // Use File class
        }

        this.pages = pages

        this.questions = questions.map(e => new Question({
            test: this,
            ...e
        }))
        this.students = students.map(e => new Student({
            test: this,
            ...e
        }))
        this.targets = targets.map(e => new Target({
            test: this,
            ...e
        }))
        this.test_data_result = test_data_result

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
            test_pdf: false,
            save_to_database: false

        }

        this.gpt_provider = gpt_provider
        this.gpt_model = gpt_model
        this.grade_rules = grade_rules

    }
    get modelConfig() {
        return {
            google: {
                "gemini-2.0-pro-exp-02-05": {
                    test_recognition: "nieuw, zeer langzaam en werkt soms",
                    test_generation: "nieuw, zeer langzaam en werkt soms",
                    text_recognition: "nieuw, zeer langzaam en werkt soms",
                    grading: "nieuw, zeer langzaam en werkt soms",
                },
                "gemini-2.0-flash": {
                    test_recognition: "snel, nieuw en geeft soms error",
                    test_generation: "snel, nieuw en geeft soms error",
                    text_recognition: "snel, nieuw en geeft soms error",
                    grading: "snel, nieuw en geeft soms error",
                },
                "gemini-1.5-pro": {
                    test_recognition: "prima, maar oud",
                    test_generation: "prima, maar oud",
                    text_recognition: "prima, maar oud",
                    grading: "prima, maar oud",
                },
                "learnlm-1.5-pro-experimental": {
                    test_recognition: "gemaakt voor feedback leerling, maar oud",
                    test_generation: "gemaakt voor feedback leerling, maar oud",
                    text_recognition: "gemaakt voor feedback leerling, maar oud",
                    grading: "gemaakt voor feedback leerling, maar oud",
                },
                "gemini-exp-1206": {
                    test_recognition: "pro 2.0, werkt meestal",
                    test_generation: "pro 2.0, werkt meestal",
                    text_recognition: "pro 2.0, werkt meestal",
                    grading: "pro 2.0, werkt meestal",
                }
            },
            openai: {
                "gpt-4o-mini": {
                    test_recognition: "oud, werkt voor fotoherkenning",
                    test_generation: "oud, werkt voor fotoherkenning",
                    text_recognition: "oud, werkt voor fotoherkenning",
                    grading: "oud, werkt voor fotoherkenning",
                },
                "gpt-4o": {
                    test_recognition: "duur",
                    test_generation: "duur",
                    text_recognition: "duur",
                    grading: "duur",
                },
                "gpt-o3-mini": {
                    test_recognition: "nieuw o3 model",
                    test_generation: "nieuw o3 model",
                    text_recognition: "nieuw o3 model",
                    grading: "nieuw o3 model",
                },
            },
            deepseek: {
                "deepseek-chat": {
                    test_recognition: "oude deepseek model, kan lever rare resultaten op",
                    test_generation: "oude deepseek model, kan lever rare resultaten op",
                    text_recognition: "oude deepseek model, kan lever rare resultaten op",
                    grading: "oude deepseek model, kan lever rare resultaten op",
                },
                "deepseek-reasoner": {
                    test_recognition: "r1",
                    test_generation: "r1",
                    text_recognition: "r1",
                    grading: "r1",
                }
            },
            alibaba: {
                "qwen-turbo": {
                    test_recognition: "snel, maar onvoorspelbaar",
                    test_generation: "snel, maar onvoorspelbaar",
                    text_recognition: "snel, maar onvoorspelbaar",
                    grading: "snel, maar onvoorspelbaar",
                },
                "qwen-plus": {
                    test_recognition: "prima",
                    test_generation: "prima",
                    text_recognition: "prima",
                    grading: "prima",
                },
                "qwen-max-2025-01-25": {
                    test_recognition: "nieuwste, werkt goed, geeft lange resultaten",
                    test_generation: "nieuwste, werkt goed, geeft lange resultaten",
                    text_recognition: "nieuwste, werkt goed, geeft lange resultaten",
                    grading: "nieuwste, werkt goed, geeft lange resultaten",
                },
                "qwen-max": {
                    test_recognition: "werkt ook goed",
                    test_generation: "werkt ook goed",
                    text_recognition: "werkt ook goed",
                    grading: "werkt ook goed",
                }
            }
        };
    }
    get providerModels() {
        return Object.keys(this.modelConfig).reduce((data, model) => {
            data[model] = Object.keys(this.modelConfig[model])
            return data
        }, {})

    }
    get total_model_count() {
        return sum(Object.values(this.providerModels).map(e => e.length))
    }
    gpt_models(action) {



        if (this.modelConfig[this.gpt_provider]) {
            return Object.keys(this.modelConfig[this.gpt_provider]).map(model => {
                return {
                    value: model,
                    title: model + '(' + (this.modelConfig[this.gpt_provider][model]?. [action] || '') + ')'
                }
            })
        }
        return []

    }
    get is_loading() {
        return Object.values(this.loading).some(e => e)
    }
    get total_points() {
        return sum(this.questions.map(q => q.total_points))
    }
    get student_pdf_data() {
        return this.students.map(e => e.result_pdf_data)
    }
    setQuestionNumbers() {
        this.questions.forEach((question, index) => {
            question.question_number = (index + 1).toString()
        })
    }
    async loadDataFromPdf(field_type) {
        this.loading.pdf_data = true
        console.log(field_type)
        if (["rubric", "test"].includes(field_type)) {
            this.files[field_type].data = await globals.$extractTextAndImages(this.files[field_type].raw)

        } else if (["load_pages", "students"].includes(field_type)) {
            this.students.data = await globals.$pdfToBase64Images(this.files["students"].raw)

            this.students.data.forEach(page => {
                this.addPage(page)
            })
        }
        this.loading.pdf_data = false
    }
    async generateGptTest() {
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
        if (!result.result) {
            this.loading.structure = false

            return
        }


        this.test_data_result = result.result
        this.loadTestData()
        console.log('loadTestStructure: ', result, '\n Test: ', this)
        this.loading.structure = false
    }
    async generateGptQuestion() {
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

        if (!result.result) {
            this.loading.structure = false

            return
        }


        this.addQuestion(result.result)
        console.log('loadTestQuestion: ', result, '\n Test: ', this)
        this.loading.structure = false
    }
    async loadTestStructure(use_preload = false) {
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

        if (use_preload) {

            var result = {
                result: this.saved_output
            }
        } else {


            var result = await apiRequest('/test-data', {
                requestText: request_text,
                testData: {
                    toets: test_data,
                    rubric: rubric_data
                }
            })
        }

        if (!result.result) {
            return
        }


        this.test_data_result = result.result


        console.log('loadTestStructure: ', result)
        this.loadTestData()
        this.loading.structure = false
    }
    async downloadTest() {
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
                answer_text: question.base64_answer_text,
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
    loadTestData() {
        this.targets = []

        this.test_data_result.targets?.forEach(e => {
            this.addTarget(e)
        })
        console.log(this.test_data_result)
        this.questions = []

        this.test_data_result.questions?.forEach((e, index) => {
            if (!e.question_number) {
                e.question_number = (index + 1).toString()
            }
            this.addQuestion(e)
        })
    }
    addTarget(target) {


        this.targets.push(new Target({
            test: this,
            ...target
        }))
    }
    addQuestion(question) {
        if (question.question_number) {

            this.questions.push(new Question({
                test: this,
                ...question,
            }))
        } else {
            console.log('Could not find question id for: ', question)
        }
    }
    createPages() {
        this.files.students.data.forEach(image => {
            this.addPage(image)
        })
    }
    get test_context() {
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

    addPage(base64Image) {
        this.pages.push(new ScanPage({
            base64Data: base64Image
        }, this.test_context))
    }
    async loadStudentIds() {
        await Promise.all(this.pages.map(async (page, index) => {
            return this.pages[index].detectStudentId()
        }))
    }
    async loadSections() {
        await Promise.all(this.pages.map(async (page, index) => {
            return this.pages[index].loadSections(false)
        }))


        const base64_sections = this.pages.map(page => page.sections.map(section => section.file_question_selector.base64Data || "")).flat(Infinity)

        const response = await apiRequest('/question_selector_info', {
            "base64Images": JSON.stringify(base64_sections),
            "checkbox_count": "7"
        })

        if (response.length != base64_sections.length) {
            console.log('Page: ExtractQuestionLengthError: response: ', response.length, '- sections:', this.sections.length, response)
            this.loading.create_question = false
            return
        } else {
            console.log('Page: Extract question number result: ', response)

        }
        var image_index = -1
        for (let index = 0; index < this.pages.length; index++) {
            for (let section_index = 0; section_index < this.pages[index].sections.length; section_index++) {
                image_index += 1
                if (!!response[image_index].selected_checkbox && response[image_index].selected_checkbox > 0) {
                    this.pages[index].sections[section_index].question_number = response[image_index].selected_checkbox
                    return
                }
                this.pages[index].sections[section_index].question_number = 0

            }
        }


    }

    async scanStudentIdsAndSections(use_preloaded = false) {
        this.loading.sections = true
        // const preload = []
        // await Promise.all(this.pages.map(async (page, index) => {
        if (!use_preloaded) {

            await this.loadStudentIds()


            await this.loadSections()
        }
        for (let index = 0; index < this.pages.length; index++) {


            if (use_preloaded) {
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
                //         student_id: this.pages[index].student_id,
                //         sections: this.pages[index].sections
                // })
                // console.log('preload: ', temp_section_data)
            }
        }
        // }))


        this.loading.sections = false

    }
    async loadStudents(use_preload = false) {
        this.loading.students = true

        if (use_preload) {
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
                        scan: {
                            base64Data: result?.scan?.base64Image
                        },
                        student_handwriting_percent: result?.student_handwriting_percent

                    })

                    question_result.resetPoints()

                    student.results.push(question_result)
                })

                this.students.push(student)

            })
            this.students.sort((a, b) => Number(a.student_id) - Number(b.student_id))
            this.loading.students = false

            return

        }
        const unique_student_ids = [...new Set(this.pages.map(e => e.student_id))].filter(e => e).sort((a, b) => Number(a) - Number(b))
        console.log(unique_student_ids)

        const test_context = this.test_context

        // await Promise.all(unique_student_ids.map(async student_id => {
        for (var student_id in unique_student_ids) {
            var student_id = unique_student_ids[student_id]
            const student_pages = this.pages.filter(e => e.student_id == student_id)

            var student_sections = []

            student_pages.forEach(page => {
                student_sections = student_sections.concat(page.sections)
            });

            var scan_questions = await Promise.all(this.questions.map(async question => {
                const question_sections = student_sections.filter(section => section.question_number.toString() == question.question_number.toString())
                if (question_sections.length == 0) {
                    return {
                        success: false,
                        question_id: question.id
                    }

                }
                const response = await apiRequest('/link_answer_sections', {
                    sections: question_sections.map(section => section.file_answer.base64Data),
                })

                if (!response || response.error) {
                    return {
                        success: false,
                        question_id: question.id
                    }
                }

                const scan_question = new ScanQuestion({
                    file: {
                        base64Data: response
                    },
                    question_number: question.question_number
                })

                await scan_question.extractText(test_context, this.gpt_provider, this.gpt_model)

                return {
                    success: true,
                    question_id: question.id,
                    scan_question,
                    student_handwriting_percent: response.student_handwriting_percent
                }
            }))

            const student = new Student({
                test: this,
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
            if (index == -1) {
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
                            base64Data: result.scan.file.base64Data,
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
    async gradeStudents(use_preload = false) {
        this.loading.grading = true
        // await Promise.all(this.students.map(e => e.grade(use_preload)))
        for (let i = 0; i < this.students.length; i++) {
            await this.students[i].grade(use_preload)

        }
        this.loading.grading = false
    }
    async downloadStudentResults(feedback_field = false) {
        await downloadResultPdf(this.student_pdf_data, feedback_field, 'AlleResultaten')
    }
    async loadPreload() {
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
    async saveToDatabase() {
        this.loading.save_to_database = true;
        const userStore = useUserStore();
        if (!userStore.user) {
            console.error("No user logged in.");
            this.loading.save_to_database = false;
            return;
        }
        this.user_id = userStore.user.id;

        // 1. Store the main Test data
        // store all test files and save the id

        const testData = {
            user_id: this.user_id,
            name: this.test_settings.test_name,
            is_public: false, // Or get from some user input/setting
            gpt_provider: this.gpt_provider,
            gpt_model: this.gpt_model,
            grade_rules: this.grade_rules,
            test_data_result: this.test_data_result,
        };

        const {
            data: savedTest,
            error: testError
        } = await supabase
            .from('tests')
            .insert([testData])
            .select();

        if (testError) {
            console.error("Error saving test:", testError);
            this.loading.save_to_database = false;
            return;
        }

        const testId = savedTest[0].id;
        this.id = testId

        await Promise.all(Object.keys(this.files).map(async key => {
            if (this.files[key].raw) {

                this.files[key].base64Data = this.files[key].raw
            }
            await this.files[key].store(this.id)

            const {
                error
            } = await supabase
                .from('files')
                .insert([{
                    test_id: this.id,
                    location: this.files[key].location,
                    file_type: this.files[key].file_type,
                }])
            if (error) {
                console.log('File insert error: ', error)
            }

        }))

        //store gpt test settings
        const gptTestData = {
            test_id: testId,
            school_type: this.gpt_test.school_type,
            school_year: this.gpt_test.school_year,
            school_subject: this.gpt_test.school_subject,
            subject: this.gpt_test.subject,
            learned: this.gpt_test.learned,
            requested_topics: this.gpt_test.requested_topics,
        };
        const {
            error: gptTestError
        } = await supabase
            .from('gpt_tests_settings')
            .insert([gptTestData]);

        if (gptTestError)
            console.error("Error saving GPT Test settings:", gptTestError);

        // Store GPT Question settings
        const gptQuestionData = {
            test_id: testId,
            rtti: this.gpt_question.rtti,
            subject: this.gpt_question.subject,
            targets: this.gpt_question.targets,
            point_count: this.gpt_question.point_count,
        };

        const {
            error: gptQuestionError
        } = await supabase
            .from('gpt_questions_settings')
            .insert([gptQuestionData]);

        if (gptQuestionError)
            console.error("Error saving GPT Question settings:", gptQuestionError);

        // Store Test PDF settings
        const testPdfSettingsData = {
            test_id: testId,
            test_name: this.test_settings.test_name,
            show_targets: this.test_settings.show_targets,
            show_answers: this.test_settings.show_answers,
            output_type: this.test_settings.output_type,
        };
        const {
            error: testPdfSettingsError
        } = await supabase
            .from('test_pdf_settings')
            .insert([testPdfSettingsData]);
        if (testPdfSettingsError)
            console.error("Error saving Test PDF settings:", testPdfSettingsError);

        // 2. Store Targets
        for (const target of this.targets) {
            const targetData = {
                test_id: testId,
                target_name: target.target_name,
                explanation: target.explanation,
            };
            const {
                data: savedTarget,
                error: targetError
            } = await supabase
                .from('targets')
                .insert([targetData]).select();
            if (targetError) {
                console.error("Error saving target:", targetError);
                continue; // Skip to the next target on error
            }
            target.id = savedTarget[0].id; // Store the database ID
        }

        // 3. Store Questions and related data
        for (const question of this.questions) {
            const questionData = {
                test_id: testId,
                question_number: question.question_number,
                question_text: question.question_text,
                question_context: question.question_context,
                answer_text: question.base64_answer_text, // Assuming this is text, not a file
                is_draw_question: question.is_draw_question,
            };
            const {
                data: savedQuestion,
                error: questionError
            } = await supabase
                .from('questions')
                .insert([questionData]).select();

            if (questionError) {
                console.error("Error saving question:", questionError);
                continue;
            }
            question.id = savedQuestion[0].id;

            // Store Rubric Points
            for (const point of question.points) {
                const pointData = {
                    question_id: question.id,
                    point_text: point.point_text,
                    point_name: point.point_name,
                    point_weight: point.point_weight,
                    point_index: point.point_index,
                    target_id: point.target.id, // Use the saved target ID
                };
                const {
                    error: pointError
                } = await supabase
                    .from('rubric_points')
                    .insert([pointData]);
                if (pointError) console.error("Error saving rubric point:", pointError);
            }
        }
        //store all pages and section files
        for (const page of this.pages) {
            await page.file.store(this.id) // Store the page file
            const {
                error: pageFileError
            } = await supabase.from('files').insert([{
                test_id: this.id,
                location: page.file.location,
                file_type: page.file.file_type
            }])
            if (pageFileError) {
                console.log('Page insert error: ', pageFileError)
            }

            for (const section of page.sections) {
                await section.file_full.store(this.id)
                await section.file_section_finder.store(this.id)
                await section.file_question_selector.store(this.id)
                await section.file_answer.store(this.id)
                // Store section details
                const sectionData = {
                    test_id: this.id,
                    question_number: section.question_number,
                    is_qr_section: section.is_qr_section,
                    student_id: section.student_id,
                };
                const {
                    data: savedSection,
                    error: sectionError
                } = await supabase.from('sections').insert([sectionData]).select();
                if (sectionError) {
                    console.error("Error saving section:", sectionError);
                    continue
                }

                const section_id = savedSection[0].id

                const files = [{
                    file: section.file_full,
                    type: 'section_full'
                }, {
                    file: section.file_section_finder,
                    type: 'section_finder'
                }, {
                    file: section.file_question_selector,
                    type: 'section_question_selector'
                }, {
                    file: section.file_answer,
                    type: 'section_answer'
                }]

                files.forEach(async file => {
                    const {
                        error: sectionFileError
                    } = await supabase.from('files').insert([{
                        test_id: this.id,
                        location: file.file.location,
                        file_type: file.type
                    }])
                    if (sectionFileError) {
                        console.log('Section File insert error: ', sectionFileError)
                    }
                })
            }
        }
        // 4. Store Students and Results
        for (const student of this.students) {
            const studentData = {
                test_id: testId,
                student_id: student.student_id,
            };
            const {
                data: savedStudent,
                error: studentError
            } = await supabase
                .from('students')
                .insert([studentData]).select();
            if (studentError) {
                console.error("Error saving student:", studentError);
                continue;
            }
            student.id = savedStudent[0].id;

            // Store StudentQuestionResults
            for (const result of student.results) {
                const resultData = {
                    student_id: student.id,
                    question_id: result.question.id,
                    feedback: result.feedback,
                    student_handwriting_percent: result.student_handwriting_percent
                };
                const {
                    data: savedResult,
                    error: resultError
                } = await supabase
                    .from('students_question_results')
                    .insert([resultData]).select();

                if (resultError) {
                    console.error("Error saving student question result:", resultError);
                    continue;
                }
                result.id = savedResult[0].id;

                //store the result file
                if (result.scan.file) {

                    await result.scan.file.store(null, result.id)
                    const {
                        error
                    } = await supabase
                        .from('files')
                        .insert([{
                            student_question_result_id: result.id,
                            location: result.scan.file.location,
                            file_type: result.scan.file.file_type,
                        }])
                    if (error) {
                        console.log('result File insert error: ', error)
                    }
                }
                // Store StudentPointResults (linking to RubricPoint)
                for (const pointIndex in result.point_results) {
                    const pointResult = result.point_results[pointIndex];
                    const pointResultData = {
                        student_question_result_id: result.id,
                        point_index: pointResult.point_index,
                        has_point: pointResult.has_point,
                        feedback: pointResult.feedback,
                    };
                    const {
                        error: pointResultError
                    } = await supabase
                        .from('students_points_results')
                        .insert([pointResultData]);
                    if (pointResultError)
                        console.error("Error saving student point result:", pointResultError);
                }
                //store grade instance
                const gradeInstanceData = {
                    student_question_result_id: result.id,
                    is_gpt: result.grade_instance.is_gpt,
                    model: result.grade_instance.model,
                    provider: result.grade_instance.provider
                }
                const {
                    error: gradeError
                } = await supabase.from('grade_instances').insert([gradeInstanceData])
                if (gradeError) {
                    console.log('Grade error: ', gradeError)
                }
            }
        }

        this.loading.save_to_database = false;
    }


}


class Question {
    constructor({
        test = new Test({}),
        id = getRandomID(),
        question_number = "",
        question_text = "",
        question_context = "",
        answer_text = "",
        is_draw_question = false,
        points = [],
    }) {
        this.test = test
        this.is_draw_question = is_draw_question
        this.id = id
        this.question_number = question_number
        this.question_context = question_context
        this.question_text = question_text
        this.base64_answer_text = answer_text
        this.points = []

        points.forEach(e => this.addRubricPoint(e))
    }
    get total_points() {
        return sum(this.points.map(point => point.point_weight))
    }
    addRubricPoint(point) {
        const target = this.test.targets.find(e => e.target_name == point.target_name)


        this.points.push(new RubricPoint({
            question: this,
            ...point,
            target
        }))
    }
}

class RubricPoint {
    constructor({
        question = new Question({}),
        id = getRandomID(),
        point_text = "",
        point_name = "",
        point_weight = 1,
        point_index = 0,
        target = new Target({}),
        target_id = null
    }) {
        this.question = question

        this.id = id
        this.point_index = point_index
        this.point_text = point_text
        this.point_name = point_name
        this.point_weight = point_weight
        this.target_id = target_id || target.id
    }
    get target() {
        return this.question.test.targets.find(e => e.id == this.target_id)
    }
}

class Target {
    constructor({
        test = new Test({}),
        id = getRandomID(),
        target_name = "",
        explanation = "",
    }) {
        this.test = test

        this.id = id
        this.target_name = target_name
        this.explanation = explanation
    }
    get average_received_points() {
        return Math.round(sum(this.test.students.map(student => sum(student.results.map(q_result => sum(Object.values(q_result.point_results).filter(p_result => p_result.point.target_id == this.id).filter(p_result => p_result.has_point).map(p_result => p_result.point.point_weight)))))) / this.test.students.length * 1000) / 1000
    }
    get total_points() {
        return sum(this.test.questions.map(q => sum(q.points.filter(e => e.target_id == this.id).map(e => e.point_weight))))
    }
    get percent() {
        return (this.average_received_points / this.total_points * 100).toFixed(1) + '%'
    }
}

class Student {
    constructor({
        test = new Test({}),
        id = getRandomID(),
        student_id = "",
        results = [],
        is_grading = false,
    }) {
        this.test = test
        this.id = id
        this.student_id = student_id
        this.results = results.map(e => new StudentQuestionResult({
            student: this,
        }))
        this.results.forEach((e, index) => this.results[index].resetPoints())
        this.is_grading = is_grading
    }

    get target_results() {
        const target_results = {}
        this.test.targets.forEach(target => {
            var total_points = 0
            var received_points = 0

            this.test.questions.forEach(question => {
                question.points.forEach(point => {
                    if (point.target_id == target.id) {
                        total_points += 1

                        const question_result = this.results.find(e => e.question_id == question.id)
                        if (question_result) {

                            const point_result = question_result.point_results[point.point_index]
                            if (point_result) {
                                if (point_result.has_point) {
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
                percent: (received_points / total_points * 100).toFixed(1) + '%',
                target: target,
            }
        })
        return target_results
    }
    get question_results() {
        const question_results = {}
        this.test.questions.forEach(question => {
            var total_points = 0
            var received_points = 0

            const result = this.results.find(e => e.question_id == question.id)
            if (result) {
                question.points.forEach(point => {
                    total_points += 1

                    const point_result = result.point_results[point.point_index]
                    if (point_result) {
                        if (point_result.has_point) {
                            received_points += point.point_weight
                        }
                    }
                })
            }


            question_results[question.id] = {
                total_points: total_points,
                received_points: received_points,
                percent: (received_points / total_points * 100).toFixed(1) + '%',
                result: result,
                question: question,
            }
        })
        return question_results
    }

    get received_points() {
        return sum(Object.values(this.question_results).map(e => e.received_points))
    }
    get result_pdf_data() {
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
    async grade(use_preload = false) {
        this.is_grading = true
        await Promise.all(this.results.map(async question_result => {
            await question_result.grade(use_preload)
        }))
        console.log('Temp: ', temp_saved_grade_data)


        this.is_grading = false
    }
    async downloadStudentResult(feedback_field = false) {
        console.log('Starting download: ')
        await downloadResultPdf([this.result_pdf_data], feedback_field, 'LeerlingResultaat_' + this.student_id)
    }


}

class GradeInstance {
    constructor({
        is_gpt = false,
        model = null,
        provider = null,
    }) {
        this.is_gpt = is_gpt
        this.model = model
        this.provider = provider
    }
}

class StudentQuestionResult {
    constructor({
        id = getRandomID(),
        student = new Student({}),
        grade_instance = new GradeInstance({}),
        question_id = "",
        feedback = "",
        point_results = {},
        scan = new ScanQuestion({
            file: {}
        }),
        is_grading = false,
        student_handwriting_percent = 0
    }) {
        this.id = id
        this.student = student
        this.grade_instance = grade_instance
        this.question_id = question_id
        this.feedback = feedback
        this.point_results = point_results
        this.scan = new ScanQuestion({
            ...scan,
            file: scan.file
        })
        this.is_grading = is_grading
        this.student_handwriting_percent = student_handwriting_percent

    }
    get question() {
        return this.student.test.questions.find(e => e.id == this.question_id) || new Question({})
    }
    resetPoints() {
        this.point_results = {}
        this.question.points.forEach(point => {
            this.point_results[point.point_index] = new StudentPointResult({
                student_result: this,
                point_index: point.point_index
            })
        })
    }
    async grade(use_preload = false) {
        this.is_grading = true

        if ((!this.question.is_draw_question && this.scan.text.length == 0) ||
            (this.question.is_draw_question && this.scan.file.base64Data.length == 0)
        ) {
            console.log('No answer found for: student ', this.student.student_id, ' question: ', this.question.question_number)
            return
        }

        const context = this.student.test.test_context

        if (use_preload) {
            if (this.student.test.saved_grade_data[this.student.student_id]?. [this.question.question_number]) {
                var response = this.student.test.saved_grade_data[this.student.student_id]?. [this.question.question_number]
            }
        } else {
            // if (this.question.is_draw_question){
            //         var model = "gemini-2.0-flash-exp"
            //         var provider = "google"
            // }



            var response = await apiRequest('/grade', {
                gradeRules: this.student.test.grade_rules,
                rubric: context.getRubric(this.question.question_number),
                question: context.getQuestion(this.question.question_number),
                answer: this.question.is_draw_question ? "" : this.scan.text,
                studentImage: this.question.is_draw_question ? this.scan.file.base64Data : undefined,
                model: this.student.test.gpt_model,
                provider: this.student.test.gpt_provider,
            })
            if (this.question.is_draw_question) {

                await delay(2000)
            }


        }
        if (!use_preload) {

            console.log('Graded: student ', this.student.student_id, '    question: ', this.question.question_number, ':', response)
        }
        if (response && response.result && response.result.points) {
            var lowest_point_index = 0
            const sorted_points_indecies = response.result.points.map(e => e.point_index).sort((a, b) => a - b)
            if (sorted_points_indecies.length > 0) {
                lowest_point_index = sorted_points_indecies[0]
            }

            if (!temp_saved_grade_data[this.student.student_id]) {
                temp_saved_grade_data[this.student.student_id] = {}
            }
            temp_saved_grade_data[this.student.student_id][this.question.question_number] = response

            this.feedback = response.result.feedback
            response.result.points.forEach(response_point => {
                // const index = this.points.findIndex(point => point.point.point_index = response_point.point_index)
                if (this.point_results[response_point.point_index - lowest_point_index]) {
                    this.point_results[response_point.point_index - lowest_point_index].has_point = response_point.has_point
                    this.point_results[response_point.point_index - lowest_point_index].feedback = response_point.feedback
                }
            })
            this.grade_instance = new GradeInstance({
                is_gpt: true,
                model: response.model,
                provider: response.provider
            })
        }

        this.is_grading = false
    }
}

class StudentPointResult {
    constructor({
        id = getRandomID(),
        student_result = new StudentQuestionResult({}),
        has_point = null,
        feedback = "",
        point_index = "",
    }) {
        this.id = id
        this.student_result = student_result
        this.has_point = has_point
        this.feedback = feedback
        this.point_index = point_index
    }
    get point() {
        return this.student_result.question.points.find(e => e.point_index == this.point_index) || new RubricPoint({})
    }
}
class TestManager {
    constructor() {
        this.tests = [];
        this.loading = false;
        this.searchQuery = '';
    }

    async fetchTests() {
        this.loading = true;
        const userStore = useUserStore();

        if (!userStore.user) {
            console.error("No user logged in.");
            this.loading = false;
            return;
        }

      let query = supabase
      .from('tests')
      .select('*, gpt_tests_settings(*), gpt_questions_settings(*), test_pdf_settings(*), targets(*), questions(*, rubric_points(*)), students(*, students_question_results(*, grade_instances(*), students_points_results(*))), files(*)',
      { count: 'exact' }) // Fetch row count

        // Apply filters based on user role and test visibility.
        if (userStore.isAdmin) {
            // Admins can see all tests.
        } else {
            // Regular users see their own tests and public tests.
            query = query.or(`user_id.eq.${userStore.user.id},is_public.eq.true`);
        }

      const { data, error, count } = await query;

      if (error) {
            console.error("Error fetching tests:", error);
            this.loading = false;
            return;
        }
      this.tests = data.map(testData => this.loadTestFromData(testData))

      this.loading = false;
      console.log('Test count: ', count)
    }

    // Add method to load a single test (used by TestView)
    async fetchTest(testId) {
        this.loading = true
        const { data, error } = await supabase
            .from('tests')
            .select('*, gpt_tests_settings(*), gpt_questions_settings(*), test_pdf_settings(*), targets(*), questions(*, rubric_points(*)), students(*, students_question_results(*, grade_instances(*), students_points_results(*))), files(*)')
            .eq('id', testId)
            .single(); // Important: Use .single() for fetching one test.

        this.loading = false
        if (error) {
            console.error("Error fetching test:", error);
            throw error; // Re-throw so calling component can handle
        }
        if (data) {
          return this.loadTestFromData(data)
        }
        return null
    }
    loadTestFromData(testData){
      const test = new Test({
          id: testData.id,
          user_id: testData.user_id,
          name: testData.name, // Add test name loading.
          is_public: testData.is_public, // Load is_public
          gpt_provider: testData.gpt_provider,
          gpt_model: testData.gpt_model,
          grade_rules: testData.grade_rules,
          test_data_result: testData.test_data_result,

      });

      // Load related data (similar to your existing TestManager, but simplified)
      testData.files.forEach(fileData => {
          const file = new File({
              id: fileData.id,
              test_id: fileData.test_id,
              student_question_result_id: fileData.student_question_result_id,
              location: fileData.location,
              file_type: fileData.file_type,
              is_stored: true, // Since it's loaded from DB, it's stored.
          });

          //put them into the right test file fields
          const file_type = file.file_type.split('.')[0]
          if (Object.keys(test.files).includes(file_type)) {
            test.files[file_type] = file
          }
      });


      if (testData.gpt_tests_settings) {
          test.gpt_test = new GptTestSettings({
            ...testData.gpt_tests_settings,
            test: test, // Pass the test instance. VERY IMPORTANT.
            id: testData.gpt_tests_settings.id
        });

      }
      if (testData.gpt_questions_settings) {
          test.gpt_question = new GptQuestionSettings({
            ...testData.gpt_questions_settings,
            test: test,
            id: testData.gpt_questions_settings.id

        });
      }

      if (testData.test_pdf_settings) {
          test.test_settings = new TestPdfSettings({
              ...testData.test_pdf_settings,
              id: testData.test_pdf_settings.id
          });
      }
      if (testData.targets){
          test.targets = testData.targets.map(targetData => new Target({
              test: test,
              ...targetData
          }));
      }
      if (testData.questions){
          test.questions = testData.questions.map(questionData => {
            const question = new Question({
              test: test,
              ...questionData
            })
            question.points = questionData.rubric_points.map(pointData => new RubricPoint({
                question: question,
                ...pointData,
                target: test.targets.find(e => e.id == pointData.target_id) || new Target({})
            }))
            return question
          })
      }
      if(testData.students){
          test.students = testData.students.map(studentData => {
            const student = new Student({
                test: test,
                ...studentData
            });
            //load results
            student.results = studentData.students_question_results.map(resultData => {
              const question_result = new StudentQuestionResult({
                  student: student,
                  ...resultData
              })

              //get files
              const resultFile = testData.files.find(e => e.student_question_result_id == question_result.id)
              if (resultFile) {
                  question_result.scan.file = new File({
                      id: resultFile.id,
                      location: resultFile.location,
                      file_type: resultFile.file_type,
                      is_stored: true
                  })
              }
              //get points
              resultData.students_points_results.forEach(pointResultData => {
                  question_result.point_results[pointResultData.point_index] = new StudentPointResult({
                      student_result: question_result,
                      ...pointResultData
                  });
              });
              //get grade
              question_result.grade_instance = new GradeInstance({
                  ...resultData.grade_instances
              })

              return question_result
          })

          return student;
          })
      }
        return test;

    }


    async deleteTest(testId) {
        const testIndex = this.tests.findIndex(test => test.id === testId);
        if (testIndex === -1) {
            console.error("Test not found in TestManager.");
            return;
        }

        const test = this.tests[testIndex];

        // Delete files from Google Cloud Storage
        try {
            // Delete test-level files
            for (const fileKey in test.files) {
                if (test.files[fileKey]?.is_stored) {
                    await test.files[fileKey].deleteFromStorage();
                }
            }
            // Delete student answer files, sections and pages
            test.students.forEach(student => {
                student.results.forEach(async result => {
                    if (result.scan.file?.is_stored) {
                        await result.scan.file.deleteFromStorage()
                    }
                })
            })

            test.pages.forEach(page => {
                if (page.file?.is_stored) {
                    page.file.deleteFromStorage()
                }
                page.sections.forEach(section => {
                    if (section.file_full?.is_stored) {
                        section.file_full.deleteFromStorage()
                    }
                    if (section.file_section_finder?.is_stored) {
                        section.file_section_finder.deleteFromStorage()
                    }
                    if (section.file_question_selector?.is_stored) {
                        section.file_question_selector.deleteFromStorage()
                    }
                    if (section.file_answer?.is_stored) {
                        section.file_answer.deleteFromStorage()
                    }
                })
            })


        } catch (error) {
            console.error("Error deleting files from storage:", error);
            // Even if file deletion fails, proceed with deleting from the database
        }

        // Delete from Supabase
        const {
            error
        } = await supabase.from('tests').delete().eq('id', testId);

        if (error) {
            console.error("Error deleting test from Supabase:", error);
            return; // Don't remove from local array if database deletion fails
        }
        //delete files from supabase
        const {
            error: fileError
        } = await supabase.from('files').delete().eq('test_id', testId)
        if (fileError) {
            console.log('File delete error', fileError)
        }


        // Remove from the local array *only* if database deletion is successful
        this.tests.splice(testIndex, 1);
    }
    get filteredTests() {
        if (!this.searchQuery) {
            return this.tests;
        }
        const query = this.searchQuery.toLowerCase();
        return this.tests.filter(test =>
            test.test_settings.test_name.toLowerCase().includes(query)
        );
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
    File,
    TestManager,

}
// --- END OF FILE scan_api_classes.js ---