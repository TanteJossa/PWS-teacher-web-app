// --- START OF FILE scan_api_classes.js ---
import {
    getRandomID,
    delay,
    sum,
    apiRequest, // Keep apiRequest if still used for other APIs, otherwise remove
    downloadResultPdf,
    downloadTest
} from '@/helpers';
import {
    db,
    storage,
    auth,
    currentUser
} from './firebase.js'; // Import Firebase instances
import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    getStorage
} from "firebase/storage";
import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    writeBatch
} from "firebase/firestore";

import {
    globals
} from '@/main'
import {
    useUserStore
} from '@/stores/user_store'; // Import user store
import {
    times
} from 'lodash';

var temp_saved_grade_data = {}
var temp_section_data = []


// --- Base Classes ---

class FirestoreBase {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this.dbCollection = collection(db, collectionName);
    }

    async getById(id) {
        if (!id) return null;
        const docRef = doc(this.dbCollection, id);
        const docSnap = await getDoc(docRef);
        console.log(docSnap.data())
        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            return null;
        }
    }

    async getAll() {
        const querySnapshot = await getDocs(this.dbCollection);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async add(data) {
        try {
            const docRef = await addDoc(this.dbCollection, data);
            return docRef.id; // Return the newly created document ID
        } catch (e) {
            console.error("Error adding document: ", e);
            throw e;
        }
    }

    async update(id, data) {
        if (!id) throw new Error("Update requires a document ID.");
        try {
            const docRef = doc(this.dbCollection, id);
            await updateDoc(docRef, data);
            return true; // Indicate success
        } catch (e) {
            console.error("Error updating document: ", e);
            throw e;
        }
    }

    async delete(id) {
        if (!id) throw new Error("Delete requires a document ID.");
        try {
            const docRef = doc(this.dbCollection, id);
            await deleteDoc(docRef);
            return true; // Indicate success
        } catch (e) {
            console.error("Error deleting document: ", e);
            throw e;
        }
    }

    async getByField(fieldName, fieldValue) {
        const q = query(this.dbCollection, where(fieldName, "==", fieldValue));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }
}



// --- Models ---



class User extends FirestoreBase {
    constructor({
        uid,
        email,
        displayName = null,
        role = 'user',
        photoURL = null
    }) {
        super('users'); // The Firestore collection name
        this.uid = uid;
        this.email = email;
        this.displayName = displayName;
        this.role = role;
        this.photoURL = photoURL;
    }

    // No longer needed, FirestoreBase handles this
    // async save() { ... }

    // No longer needed, FirestoreBase handles this
    // static async find(uid) { ... }

    // toFirestoreData is a helper to convert to a plain object for Firestore
    toFirestoreData() {
        return {
            uid: this.uid,
            email: this.email,
            displayName: this.displayName,
            role: this.role,
            photoURL: this.photoURL, // Store photoURL
            // Add other fields as needed
        };
    }

    // fromFirestoreData is a helper to create a User instance from Firestore data
    static fromFirestoreData(data) {
        return new User(data);
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
        // this.file = new File({ ...file, file_type: 'jpeg' }); // REMOVE File instance
        this.base64Image = file.base64Data || null; // Store base64 directly //NEW
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
    get image() { //Updated getter
        switch (this.selected_image_type) {
            case "raw":
                return this.base64Image //NEW
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
    set image(val) { //Updated setter
        switch (this.selected_image_type) {
            case "raw":
                this.base64Image = val //NEW
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

        this.base64_full = full.base64Data || null; //NEW
        this.base64_section_finder = section_finder.base64Data || null; //NEW
        this.base64_question_selector = question_selector.base64Data || null; //NEW
        this.base64_answer = answer.base64Data || null; //NEW


        this.is_qr_section = is_qr_section
        this.student_id = student_id
        this.question_number = question_number
        this.question_number_data = question_number_data
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
            file_type: 'png'
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


class GptQuestionSettings extends FirestoreBase {
    constructor({
        test = null,
        id = null,
        rtti = "i",
        subject = "motor",
        targets = {},
        point_count = 3

    }) {
        super('gpt_questions_settings');
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
    async saveToFirestore(testId) {
        if (!testId) {
            console.error("GptQuestionSettings: saveToFirestore requires a testId.");
            return false;
        }

        const data = {
            test_id: testId,
            rtti: this.rtti,
            subject: this.subject,
            targets: this.targets,
            point_count: this.point_count,
        };

        try {
            if (this.id) {
                // Update existing document
                await this.update(this.id, data);
                console.log(`GptQuestionSettings updated for test ${testId}, id: ${this.id}`);
            } else {
                // Create new document
                this.id = await this.add(data);
                console.log(`GptQuestionSettings created for test ${testId}, new id: ${this.id}`);
            }
            return true;
        } catch (error) {
            console.error("Error saving GptQuestionSettings:", error);
            return false;
        }
    }
}

class GptTestSettings extends FirestoreBase {
    constructor({
        test = null,
        id = null,
        school_type = "vwo",
        school_year = 3,
        school_subject = "Scheikunde",
        subject = "Verbranding",
        learned = "",
        requested_topics = "",
    }) {
        super('gpt_tests_settings');
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

            Daarnaast moet je bij de hele toets een paar overkoepelende leerdoelen bedenken.
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
    async saveToFirestore(testId) {
        if (!testId) {
            console.error("GptTestSettings: saveToFirestore requires a testId.");
            return false;
        }

        const data = {
            test_id: testId,
            school_type: this.school_type,
            school_year: this.school_year,
            school_subject: this.school_subject,
            subject: this.subject,
            learned: this.learned,
            requested_topics: this.requested_topics,
        };
        console.log(data)
        try {
            if (this.id) {
                // Update existing document
                await this.update(this.id, data);
                console.log(`GptTestSettings updated for test ${testId}, id: ${this.id}`);

            } else {
                // Create new document
                this.id = await this.add(data);
                console.log(`GptTestSettings created for test ${testId}, new id: ${this.id}`);
            }
            return true;
        } catch (error) {
            console.error("Error saving GptTestSettings:", error);
            return false;
        }
    }


}

class TestPdfSettings extends FirestoreBase {
    constructor({
        test = null,
        id = null,
        name = "",
        show_targets = true,
        show_answers = false,
        output_type = 'docx'
    }) {
        super('test_pdf_settings');
        this.test = test
        this.id = id
        this.name = name
        this.show_targets = show_targets
        this.show_answers = show_answers
        this.output_type = output_type
    }
    async saveToFirestore(testId) {
        if (!testId) {
            console.error("TestPdfSettings: saveToFirestore requires a testId.");
            return false;
        }

        const data = {
            test_id: testId,
            name: this.name,
            show_targets: this.show_targets,
            show_answers: this.show_answers,
            output_type: this.output_type,
        };

        try {
            if (this.id) {
                // Update existing document
                await this.update(this.id, data);
                console.log(`TestPdfSettings updated for test ${testId}, id: ${this.id}`);
            } else {
                // Create new document
                this.id = await this.add(data);
                console.log(`TestPdfSettings created for test ${testId}, new id: ${this.id}`);
            }
            return true;
        } catch (error) {
            console.error("Error saving TestPdfSettings:", error);
            return false;
        }
    }

}

class Test extends FirestoreBase {
    constructor({
        id = null,
        user_id = null,
        files = { // Modified files structure - storing paths
            test: null,
            rubric: null,
            students: null,
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
        name = "",
        is_public = false,

        test_pdf_raw = null, //NEW: raw file data
        rubric_pdf_raw = null, //NEW: raw file data
        student_pdf_raw = null, //NEW: raw file data

    }) {
        super('tests');
        this.id = id
        this.user_id = user_id;
        this.name = name
        this.files = files // Updated to store paths directly

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

        this.is_public = is_public

        this.test_pdf_raw = test_pdf_raw //NEW
        this.rubric_pdf_raw = rubric_pdf_raw //NEW
        this.student_pdf_raw = student_pdf_raw //NEW


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
                },
                'gemini-2.0-flash-lite-preview-02-05': {
                    test_recognition: "snel",
                    test_generation: "snel",
                    text_recognition: "snel",
                    grading: "snel",
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

                Daarnaast moet je bij de hele toets een paar overkoepelende leerdoelen bedenken.
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

        if (response && response.length != base64_sections.length) {
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
        console.log("Test: Starting Save to Firestore...");

        if (!currentUser.value) {
            console.error("Test: No user logged in.");
            this.loading.save_to_database = false;
            return false;
        }
        this.user_id = currentUser.value.uid;

        try {
            // 1. Save Test Metadata (as before, but with the user_id check)
            const testData = {
                user_id: this.user_id, // This *must* be present.
                name: this.name,
                is_public: this.is_public,
                gpt_provider: this.gpt_provider,
                gpt_model: this.gpt_model,
                grade_rules: this.grade_rules || "",
                test_data_result: this.test_data_result ? {
                    ...this.test_data_result,
                    questions: [],
                    targets: []
                } : null,
                updated_at: new Date().getUTCDate()

            };
            let testId = this.id;

            // *** CRUCIAL CHECK ***
            if (!this.user_id) {
                console.error("Test: saveToDatabase: this.user_id is undefined!", this);
                this.loading.save_to_database = false;
                return false; // Prevent the update/insert
            }

            if (testId) {
                await super.update(testId, testData); // Update existing test
                console.log(`Test: Test Metadata Updated. Test ID: ${testId}`);
            } else {
                testId = await super.add(testData); // Add new test
                this.id = testId; // Update instance with new ID
                console.log(`Test: Test Metadata Created. Test ID: ${testId}`);
            }

            // 2. Save GPT Settings
            await this.gpt_test.saveToFirestore(testId);
            await this.gpt_question.saveToFirestore(testId);
            await this.test_settings.saveToFirestore(testId);

            // --- Child Cleanup (BEFORE adding/updating) ---
            await this.cleanupUnusedChildren(testId);

            // 3. Save Targets and Questions (using batch for efficiency)
            await this.saveTargetsAndQuestions(testId);

            // 4. Save Pages and Sections (also handles file metadata)
            await this.savePagesAndSections(testId);

            // 5. Save Students and Results
            await this.saveStudentsAndResults(testId);

            // 6. Save Files (Test, Rubric, Students, Page Files, Section Files, Result Files)
            // Only store the main files, if the base64 data exists
            await this.saveTestFiles(testId);
            await this.savePageAndSectionFiles(testId); // Includes file saving logic
            await this.saveStudentResultFiles(testId);


            console.log("Test: Save to Firestore Completed Successfully. Test ID:", testId);
            this.loading.save_to_database = false;
            return true;

        } catch (e) {
            console.error("Test: Exception during Firestore save:", e);
            this.loading.save_to_database = false;
            return false;
        }
    }

    async saveGPTSettingsMetadataFunction() { // Deprecated - settings are now saved within saveToDatabase
        return this.gpt_test.saveToFirestore(this.id) && this.gpt_question.saveToFirestore(this.id) && this.test_settings.saveToFirestore(this.id)
    }

    async saveTargetsAndQuestionsMetadataFunction() { // Deprecated - targets and questions are now saved within saveToDatabase
        return this.saveTargetsAndQuestions(this.id)
    }

    async savePagesAndSectionsMetadataFunction() { // Deprecated - pages and sections are now saved within saveToDatabase
        return this.savePagesAndSections(this.id)
    }


    async saveStudentsAndResultsMetadataFunction() { // Deprecated - students and results are now saved within saveToDatabase
        return this.saveStudentsAndResults(this.id)
    }


    async saveToDatabaseFunction() { // Deprecated - use saveToDatabase
        return this.saveToDatabase()
    }

    async saveTestFiles(testId) {
        console.log("Test: Starting Test Files Upload...");
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save files.");
            return false;
        }

        try {
            const filesToUpload = [{
                    key: 'test',
                    localFile: this.test_pdf_raw,
                    storagePath: `tests/${testId}/test.pdf`,
                    contentType: 'application/pdf',
                    pathKey: 'test'
                },
                {
                    key: 'rubric',
                    localFile: this.rubric_pdf_raw,
                    storagePath: `tests/${testId}/rubric.pdf`,
                    contentType: 'application/pdf',
                    pathKey: 'rubric'
                },
                {
                    key: 'students',
                    localFile: this.student_pdf_raw,
                    storagePath: `tests/${testId}/students.pdf`,
                    contentType: 'application/pdf',
                    pathKey: 'students'
                },
            ];

            await Promise.all(filesToUpload.map(async fileInfo => {
                if (fileInfo.localFile) { // Check if there's a file to upload
                    const storageRef = ref(storage, fileInfo.storagePath); // Create storage ref
                    const snapshot = await uploadBytes(storageRef, fileInfo.localFile, {
                        contentType: fileInfo.contentType
                    }); // Upload file
                    const downloadURL = getDownloadURL(snapshot.ref); // Get download URL
                    this.files[fileInfo.pathKey] = fileInfo.storagePath; // Store storage path NOT URL

                    const fileData = { // Update Firestore with storage path
                        test_id: testId,
                        location: fileInfo.storagePath, // Store Path NOT URL
                        file_type: fileInfo.contentType.split('/')[1], // Extract file extension, e.g., "pdf"
                    };
                    const existingFileDoc = await this.getByField('files', 'location', fileInfo.location)
                    if (existingFileDoc.length > 0 && existingFileDoc[0].id) {
                        await updateDoc(doc(collection(db, 'files'), existingFileDoc[0].id), fileData); // Update file metadata in Firestore
                    } else {
                        await addDoc(collection(db, 'files'), fileData); // Add file metadata to Firestore
                    }
                    console.log(`${fileInfo.key} file uploaded to: ${fileInfo.storagePath}`);
                }
            }));

            console.log("Test: Test Files Uploaded Successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception uploadingTest Files Uploaded Successfully. Test ID:", testId);
            return true;

        }
    }

    async savePageAndSectionFiles(testId) {
        console.log("Test: Starting Page and Section Files Upload...");
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save page and section files.");
            return false;
        }

        try {
            // Use a Firestore Batch for efficiency
            const batch = writeBatch(db);

            for (const page of this.pages) {
                if (page.base64Image) { // Check if there's base64 data for the page file
                    const storagePath = `pages/${testId}/${page.id}.jpeg`; // Define storage path for page
                    const storageRef = ref(storage, storagePath);
                    const buffer = Buffer.from(page.base64Image.split(',')[1], 'base64')
                    await uploadBytes(storageRef, buffer, {
                        contentType: 'image/jpeg'
                    }); // Upload page file
                    page.file_location = storagePath //NEW: store location in page object
                    const pageFileData = { // Update Firestore with storage path
                        test_id: testId,
                        location: storagePath,
                        file_type: 'jpeg'
                    }
                    const pageFileRef = page.file.id ? doc(collection(db, 'files'), page.file.id) : doc(collection(db, 'files')); // Assuming 'files' table for pages too
                    batch.set(pageFileRef, pageFileData, {
                        merge: true
                    }); // Use set with merge for updates/inserts
                    if (!page.file.id) {
                        page.file.id = pageFileRef.id; // Assign new ID if it's a new page file
                    }
                }


                for (const section of page.sections) {
                    // Save Section Files Metadata (Full, Finder, Selector, Answer)
                    const sectionFiles = [{
                        base64Data: section.base64_full,
                        type: 'section_full',
                        storagePath: `sections/${section.id}/full.jpeg`
                    }, {
                        base64Data: section.base64_section_finder,
                        type: 'section_finder',
                        storagePath: `sections/${section.id}/sectionFinder.jpeg`
                    }, {
                        base64Data: section.base64_question_selector,
                        type: 'section_question_selector',
                        storagePath: `sections/${section.id}/questionSelector.jpeg`
                    }, {
                        base64Data: section.base64_answer,
                        type: 'section_answer',
                        storagePath: `sections/${section.id}/answer.jpeg`
                    }];

                    for (const sectionFileDetail of sectionFiles) {
                        if (sectionFileDetail.base64Data) { // Only if there's base64 data
                            const storageRef = ref(storage, sectionFileDetail.storagePath);
                            const buffer = Buffer.from(sectionFileDetail.base64Data.split(',')[1], 'base64')

                            await uploadBytes(storageRef, buffer, {
                                contentType: 'image/jpeg'
                            }); // Upload to Firebase Storage

                            const sectionFileData = {
                                test_id: testId,
                                location: sectionFileDetail.storagePath, // Store path NOT URL
                                file_type: sectionFileDetail.type
                            };
                            const sectionFileRef = sectionFileDetail.file.id ? doc(collection(db, 'files'), sectionFileDetail.file.id) : doc(collection(db, 'files'));
                            batch.set(sectionFileRef, sectionFileData, {
                                merge: true
                            }); // Use set with merge for updates/inserts
                            if (!sectionFileDetail.file.id) {
                                sectionFileDetail.file.id = sectionFileRef.id; // Assign new ID if it's a new section file
                            }
                        }
                    }
                }
            }

            await batch.commit(); // Commit the batch write
            console.log("Test: Pages and Sections Files Uploaded Successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception saving pages and sections metadata:", e);
            return false;
        }
    }


    async saveStudentResultFiles(testId) {
        console.log("Test: Starting Student Result Files Upload...");
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save student result files.");
            return false;
        }

        try {
            // Use a Firestore Batch for efficiency
            const batch = writeBatch(db);

            for (const student of this.students) {
                for (const result of student.results) {
                    if (result.scan_base64) { // Only store if there's base64 data (new file uploaded)
                        const storagePath = `student_answers/${result.id}/answer.jpeg`;
                        const storageRef = ref(storage, storagePath);
                        const buffer = Buffer.from(result.scan_base64.split(',')[1], 'base64')
                        await uploadBytes(storageRef, buffer, {
                            contentType: 'image/jpeg'
                        }); // Store to Firebase Storage, using result ID

                        const resultFileData = {
                            student_question_result_id: result.id,
                            location: storagePath, // Store Path NOT URL
                            file_type: 'jpeg',
                        }
                        const resultFileRef = result.scan.file.id ? doc(collection(db, 'files'), result.scan.file.id) : doc(collection(db, 'files'));
                        batch.set(resultFileRef, resultFileData, {
                            merge: true
                        }); // Use set with merge for updates/inserts
                        if (!result.scan.file.id) {
                            result.scan.file.id = resultFileRef.id; // Assign new ID if it's a new result file
                        }
                    }
                }
            }

            await batch.commit(); // Commit the batch write
            console.log("Test: Student Result Files Uploaded Successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception uploading student result files:", e);
            return false;
        }
    }

    async saveTargetsAndQuestions(testId) {
        console.log("Test: Starting Targets and Questions Save to Firestore...")
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save targets and questions.");
            return false;
        }

        try {
            // Use a Firestore Batch for efficiency
            const batch = writeBatch(db);

            // 2. Save Targets
            for (const target of this.targets) {
                const targetData = {
                    test_id: testId,
                    target_name: target.target_name,
                    explanation: target.explanation,
                    updated_at: new Date().getUTCDate()

                };
                const targetRef = target.id ? doc(collection(db, 'targets'), target.id) : doc(collection(db, 'targets'));
                batch.set(targetRef, targetData, {
                    merge: true
                }); // Use set with merge for updates/inserts
                if (!target.id) {
                    target.id = targetRef.id; // Assign new ID if it's a new target
                }
            }

            console.log(this)
            // 3. Save Questions and Rubric Points
            for (const question of this.questions) {
                const questionData = {
                    test_id: testId,
                    question_number: question.question_number,
                    question_text: question.question_text,
                    question_context: question.question_context,
                    answer_text: question.base64_answer_text, // Assuming this is text, not a file
                    is_draw_question: question.is_draw_question,
                    updated_at: new Date().getUTCDate()
                };
                const questionRef = question.id ? doc(collection(db, 'questions'), question.id) : doc(collection(db, 'questions'));
                batch.set(questionRef, questionData, {
                    merge: true
                }); // Use set with merge for updates/inserts
                if (!question.id) {
                    question.id = questionRef.id; // Assign new ID if it's a new question
                }

                // Save Rubric Points for each question
                for (const point of question.points) {
                    const pointData = {
                        test_id: testId,
                        question_id: question.id,
                        point_text: point.point_text,
                        point_name: point.point_name,
                        point_weight: point.point_weight,
                        point_index: point.point_index,
                        target_id: point.target_id, // Use the saved target ID
                        updated_at: new Date().getUTCDate()
                    };
                    const pointRef = point.id ? doc(collection(db, 'rubric_points'), point.id) : doc(collection(db, 'rubric_points'));
                    batch.set(pointRef, pointData, {
                        merge: true
                    }); // Use set with merge for updates/inserts
                    if (!point.id) {
                        point.id = pointRef.id; // Assign new ID if it's a new point
                    }
                }
            }

            await batch.commit(); // Commit the batch write
            console.log("Test: Targets and Questions Saved Successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception saving targets and questions metadata:", e);
            return false;
        }
    }

    async savePagesAndSections(testId) {
        console.log("Test: Starting Pages and Sections Save to Firestore...");
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save pages and sections.");
            return false;
        }

        try {
            // Use a Firestore Batch for efficiency
            const batch = writeBatch(db);

            // Store all pages and section metadata (excluding files for now)
            for (const page of this.pages) {
                const pageData = {
                    test_id: testId,
                    file_type: page.file.file_type || "pdf" // Keep file_type metadata
                }
                const pageFileRef = page.file.id ? doc(collection(db, 'files'), page.file.id) : doc(collection(db, 'files')); // Assuming 'files' collection for pages too
                batch.set(pageFileRef, pageData, {
                    merge: true
                }); // Use set with merge for updates/inserts
                if (!page.file.id) {
                    page.file.id = pageFileRef.id; // Assign new ID if it's a new page file
                }


                for (const section of page.sections) {
                    // Store section details (no file locations for now)
                    const sectionData = {
                        test_id: testId,
                        question_number: section.question_number || 0, // Default question number
                        is_qr_section: section.is_qr_section || false,
                        student_id: section.student_id || "unknown_student",
                    };
                    const sectionRef = section.id ? doc(collection(db, 'sections'), section.id) : doc(collection(db, 'sections'));
                    batch.set(sectionRef, sectionData, {
                        merge: true
                    }); // Use set with merge for updates/inserts
                    if (!section.id) {
                        section.id = sectionRef.id; // Assign new ID if it's a new section
                    }

                    // Save Section Files Metadata (Full, Finder, Selector, Answer)
                    const sectionFiles = [{
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
                    }];

                    for (const sectionFileDetail of sectionFiles) {
                        if (sectionFileDetail.file.base64Data) { // Only if there's new base64 data
                            await sectionFileDetail.file.storeFile(testId); // Store to Firebase Storage
                        }
                        const sectionFileData = {
                            test_id: testId,
                            location: sectionFileDetail.file.location,
                            file_type: sectionFileDetail.type
                        };
                        const sectionFileRef = sectionFileDetail.file.id ? doc(collection(db, 'files'), sectionFileDetail.file.id) : doc(collection(db, 'files'));
                        batch.set(sectionFileRef, sectionFileData, {
                            merge: true
                        }); // Use set with merge for updates/inserts
                        if (!sectionFileDetail.file.id) {
                            sectionFileDetail.file.id = sectionFileRef.id; // Assign new ID if it's a new section file
                        }
                    }
                }
            }

            await batch.commit(); // Commit the batch write
            console.log("Test: Pages and Sections Saved Successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception saving pages and sections metadata:", e);
            return false;
        }
    }


    async saveStudentsAndResults(testId) {
        console.log("Test: Starting Students and Results Save to Firestore...");
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save students and results.");
            return false;
        }

        try {
            // Use a Firestore Batch for efficiency
            const batch = writeBatch(db);

            // 4. Store Students and Results
            for (const student of this.students) {
                const studentData = {
                    test_id: testId,
                    student_id: student.student_id || "unknown_student", // Default student ID
                };
                const studentRef = student.id ? doc(collection(db, 'students'), student.id) : doc(collection(db, 'students'));
                batch.set(studentRef, studentData, {
                    merge: true
                }); // Use set with merge for updates/inserts
                if (!student.id) {
                    student.id = studentRef.id; // Assign new ID if it's a new student
                }

                // Store StudentQuestionResults
                for (const result of student.results) {
                    const resultData = {
                        student_id: student.id,
                        question_id: result.question_id,
                        feedback: result.feedback || "No feedback", // Default feedback
                        student_handwriting_percent: result.student_handwriting_percent || 0,
                    };
                    const resultRef = result.id ? doc(collection(db, 'students_question_results'), result.id) : doc(collection(db, 'students_question_results'));
                    batch.set(resultRef, resultData, {
                        merge: true
                    }); // Use set with merge for updates/inserts
                    if (!result.id) {
                        result.id = resultRef.id; // Assign new ID if it's a new result
                    }

                    // Store StudentPointResults
                    for (const pointIndex in result.point_results) {
                        const pointResult = result.point_results[pointIndex];
                        const pointResultData = {
                            student_question_result_id: result.id,
                            point_index: pointResult.point_index,
                            has_point: pointResult.has_point || false, // Default has_point
                            feedback: pointResult.feedback || "No point feedback", // Default point feedback
                        };
                        const pointResultRef = pointResult.id ? doc(collection(db, 'students_points_results'), pointResult.id) : doc(collection(db, 'students_points_results'));
                        batch.set(pointResultRef, pointResultData, {
                            merge: true
                        }); // Use set with merge for updates/inserts
                        if (!pointResult.id) {
                            pointResult.id = pointResultRef.id; // Assign new ID if it's a new point result
                        }
                    }

                    // Store Grade Instance
                    const gradeInstanceData = {
                        student_question_result_id: result.id,
                        is_gpt: result.grade_instance.is_gpt || false, // Default is_gpt
                        model: result.grade_instance.model || "default_model", // Default model
                        provider: result.grade_instance.provider || "default_provider", // Default provider
                    }
                    const gradeInstanceRef = result.grade_instance.id ? doc(collection(db, 'grade_instances'), result.grade_instance.id) : doc(collection(db, 'grade_instances'));
                    batch.set(gradeInstanceRef, gradeInstanceData, {
                        merge: true
                    }); // Use set with merge for updates/inserts
                    if (!result.grade_instance.id) {
                        result.grade_instance.id = gradeInstanceRef.id; // Assign new ID if it's a new grade instance
                    }
                }
            }

            await batch.commit(); // Commit the batch write
            console.log("Test: Students and Results Saved Successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception saving students and results metadata:", e);
            return false;
        }
    }

    async saveStudentResultFiles(testId) {
        console.log("Test: Starting Student Result Files Upload...");
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save student result files.");
            return false;
        }

        try {
            // Use a Firestore Batch for efficiency
            const batch = writeBatch(db);

            for (const student of this.students) {
                for (const result of student.results) {
                    if (result.scan.file.base64Data) { // Only store if there's base64 data (new file uploaded)
                        await result.scan.file.storeFile(null, result.id); // Store to Firebase Storage, using result ID
                        const resultFileData = {
                            student_question_result_id: result.id,
                            location: result.scan.file.location,
                            file_type: result.scan.file.file_type,
                        }
                        const resultFileRef = result.scan.file.id ? doc(collection(db, 'files'), result.scan.file.id) : doc(collection(db, 'files'));
                        batch.set(resultFileRef, resultFileData, {
                            merge: true
                        }); // Use set with merge for updates/inserts
                        if (!result.scan.file.id) {
                            result.scan.file.id = resultFileRef.id; // Assign new ID if it's a new result file
                        }
                    }
                }
            }

            await batch.commit(); // Commit the batch write
            console.log("Test: Student Result Files Uploaded Successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception uploading student result files:", e);
            return false;
        }
    }

    async savePageAndSectionFiles(testId) {
        console.log("Test: Starting Page and Section Files Upload...");
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save page and section files.");
            return false;
        }

        try {
            // Use a Firestore Batch for efficiency
            const batch = writeBatch(db);

            for (const page of this.pages) {
                if (page.file.base64Data) { // Only store if there's base64 data (new page file)
                    await page.file.storeFile(testId); // Store page file to Firebase Storage
                    const pageFileData = {
                        test_id: testId,
                        location: page.file.location,
                        file_type: page.file.file_type
                    }
                    const pageFileRef = page.file.id ? doc(collection(db, 'files'), page.file.id) : doc(collection(db, 'files')); // Assuming 'files' table for pages too
                    batch.set(pageFileRef, pageFileData, {
                        merge: true
                    }); // Use set with merge for updates/inserts
                    if (!page.file.id) {
                        page.file.id = pageFileRef.id; // Assign new ID if it's a new page file
                    }
                }

                for (const section of page.sections) {
                    // Section files are handled in savePagesAndSections function already.
                    // No need to re-upload or re-save metadata here.
                    // This function is primarily for the page file itself.
                }
            }

            await batch.commit(); // Commit the batch write
            console.log("Test: Page and Section Files Uploaded Successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception uploading page and section files:", e);
            return false;
        }
    }


    async deleteFromDatabase() {
        if (!this.id) {
            console.error("Test: No ID found, cannot delete.");
            return false;
        }
        this.loading.save_to_database = true;

        try {
            // 2. Delete related files from Firebase Storage (BEFORE deleting from Firestore)
            await this.deleteRelatedFilesFromStorage();

            // 3. Delete the main test document - the cloud function will do the cascading delete
            await super.delete(this.id);

            console.log(`Test with ID ${this.id} and all related data deleted successfully.`);
            this.loading.save_to_database = false;
            return true;

        } catch (error) {
            console.error("Error deleting test and related data:", error);
            this.loading.save_to_database = false;
            return false;
        }
    }


    async deleteRelatedFilesFromStorage() {
        try {
            // Delete test-level files
            for (const fileKey in this.files) {
                if (this.files[fileKey]?.is_stored && this.files[fileKey].location) {
                    await this.files[fileKey].deleteFileFromStorage();
                }
            }
            // Delete student answer files, sections and pages
            for (const student of this.students) {
                for (const result of student.results) {
                    if (result.scan.file?.is_stored && result.scan.file.location) {
                        await result.scan.file.deleteFileFromStorage()
                    }
                }
            }

            for (const page of this.pages) {
                if (page.file?.is_stored && page.file.location) {
                    await page.file.deleteFileFromStorage()
                }
                for (const section of page.sections) {
                    if (section.file_full?.is_stored && section.file_full.location) {
                        await section.file_full.deleteFileFromStorage()
                    }
                    if (section.file_section_finder?.is_stored && section.file_section_finder.location) {
                        await section.file_section_finder.deleteFileFromStorage()
                    }
                    if (section.file_question_selector?.is_stored && section.file_question_selector.location) {
                        await section.file_question_selector.deleteFileFromStorage()
                    }
                    if (section.file_answer?.is_stored && section.file_answer.location) {
                        await section.file_answer.deleteFileFromStorage()
                    }
                }
            }

        } catch (error) {
            console.error("Error deleting files from storage:", error);
            // Continue even if file deletion fails from storage, as database entry is more critical to delete.
        }
    }
    async cleanupUnusedChildren(testId) {
        if (!testId) {
            console.error("Test: cleanupUnusedChildren requires a testId.");
            return;
        }
        const batch = writeBatch(db); // Use a batch for efficient deletion

        try {
            // --- Questions ---
            const questionQuery = query(collection(db, 'questions'), where("test_id", "==", testId));
            const questionSnapshot = await getDocs(questionQuery);
            questionSnapshot.forEach(doc => {
                // Check if the question exists in the current this.questions array
                if (!this.questions.some(q => q.id === doc.id)) {
                    console.log(`Deleting orphaned question: ${doc.id}`);
                    batch.delete(doc.ref); // Delete orphaned questions

                    // Also delete associated rubric_points
                    const pointsQuery = query(collection(db, 'rubric_points'), where("question_id", "==", doc.id));
                    getDocs(pointsQuery).then(pointsSnapshot => {
                        pointsSnapshot.forEach(pointDoc => {
                            batch.delete(pointDoc.ref);
                        });
                    });

                }
            });

            // --- Targets ---
            const targetQuery = query(collection(db, 'targets'), where("test_id", "==", testId));
            const targetSnapshot = await getDocs(targetQuery);
            targetSnapshot.forEach(doc => {
                if (!this.targets.some(t => t.id === doc.id)) {
                    console.log(`Deleting orphaned target: ${doc.id}`);
                    batch.delete(doc.ref); // Delete orphaned targets
                }
            });


            // --- Students (and related data) ---
            const studentQuery = query(collection(db, 'students'), where("test_id", "==", testId));
            const studentSnapshot = await getDocs(studentQuery);
            studentSnapshot.forEach(studentDoc => {
                if (!this.students.some(s => s.id === studentDoc.id)) {
                    console.log(`Deleting orphaned student: ${studentDoc.id}`);
                    // Also delete associated studentQuestionResults, and within those:
                    //  - studentPointResults
                    //  - gradeInstances

                    const resultsQuery = query(collection(db, "students_question_results"), where("student_id", "==", studentDoc.id));
                    getDocs(resultsQuery).then(resultSnapshot => {
                        resultSnapshot.forEach(async resultDoc => {
                            // Delete studentPointResults
                            const pointsQuery = query(collection(db, 'students_points_results'), where("student_question_result_id", "==", resultDoc.id));
                            getDocs(pointsQuery).then(pointsSnapshot => {
                                pointsSnapshot.forEach(pointDoc => {
                                    batch.delete(pointDoc.ref);
                                });
                            });

                            // Delete gradeInstances
                            const gradeQuery = query(collection(db, 'grade_instances'), where("student_question_result_id", "==", resultDoc.id));
                            getDocs(gradeQuery).then(gradeSnapshot => {
                                gradeSnapshot.forEach(gradeDoc => {
                                    batch.delete(gradeDoc.ref);
                                });
                            });
                            // Delete Student files
                            const fileQuery = query(collection(db, 'files'), where("student_question_result_id", "==", resultDoc.id));
                            getDocs(fileQuery).then(filesSnapshot => {
                                filesSnapshot.forEach(fileDoc => {
                                    batch.delete(fileDoc.ref);
                                    // Also delete from storage.
                                    const file = new File({
                                        id: fileDoc.id,
                                        test_id: fileDoc.data().test_id,
                                        student_question_result_id: fileDoc.data().student_question_result_id,
                                        location: fileDoc.data().location,
                                        file_type: fileDoc.data().fileType,
                                        is_stored: true,
                                    })
                                    file.deleteFileFromStorage()
                                });
                            });
                            batch.delete(resultDoc.ref); //Delete the student result

                        })
                    })

                    batch.delete(studentDoc.ref); // Delete the student
                }
            })

            // --- Sections ---
            // For sections, you will need to add more information, I dont know on what basis the should be deleted.
            const sectionQuery = query(collection(db, 'sections'), where("test_id", "==", testId));
            const sectionSnapshot = await getDocs(sectionQuery);
            sectionSnapshot.forEach(doc => {
                // if (!this.sections.some(s => s.id === doc.id)) { // Check this condition
                console.log(`Deleting orphaned section: ${doc.id}`);
                batch.delete(doc.ref); // Delete orphaned sections
                // }
            });

            await batch.commit(); // Commit all deletions in a single batch
        } catch (error) {
            console.error("Error cleaning up unused children:", error);
        }
    }

    // Inside the Test class, add the following method:
    async loadFromFirestore(testId) {
        if (!testId) {
            console.error("Test.loadFromFirestore: testId is required.");
            return null; // Or throw an error, depending on your preference
        }

        // try {
        // 1. Fetch the main test document
        const testDoc = await this.getById(testId); // Use inherited getById
        if (!testDoc) {
            console.warn(`Test with ID ${testId} not found.`);
            return null; // Or throw an error
        }

        // 2. Populate the Test instance
        this.id = testDoc.id;
        this.user_id = testDoc.user_id;
        this.name = testDoc.name;
        this.is_public = testDoc.is_public;
        this.gpt_provider = testDoc.gpt_provider;
        this.gpt_model = testDoc.gpt_model;
        this.grade_rules = testDoc.grade_rules;
        this.test_data_result = testDoc.test_data_result;
        // Load related data (similar to your existing TestManager, but simplified)

        // 3. Fetch child collections concurrently using Promise.all
        const [
            questionsSnapshot,
            targetsSnapshot,
            studentsSnapshot,
            gptTestSettingsSnapshot,
            gptQuestionSettingsSnapshot,
            testPdfSettingsSnapshot,
            filesSnapshot
        ] = await Promise.all([
            getDocs(query(collection(db, 'questions'), where("test_id", "==", testId))),
            getDocs(query(collection(db, 'targets'), where("test_id", "==", testId))),
            getDocs(query(collection(db, 'students'), where("test_id", "==", testId))),
            getDocs(query(collection(db, 'gpt_tests_settings'), where("test_id", "==", testId))),
            getDocs(query(collection(db, 'gpt_questions_settings'), where("test_id", "==", testId))),
            getDocs(query(collection(db, 'test_pdf_settings'), where("test_id", "==", testId))),
            getDocs(query(collection(db, 'files'), where("test_id", "==", testId))), // Get file metadata
        ]);

        // 4. Process and assign child data
        this.questions = questionsSnapshot.docs.map(doc => new Question({
            test: this,
            ...doc.data(),
            id: doc.id
        })); // Create Question instances
        this.targets = targetsSnapshot.docs.map(doc => new Target({
            test: this,
            ...doc.data(),
            id: doc.id
        }));
        this.students = studentsSnapshot.docs.map(doc => {
            const student = new Student({
                test: this,
                ...doc.data(),
                id: doc.id
            });
            return student;
        });
        this.gpt_test = new GptTestSettings({
            test: this,
            ...(gptTestSettingsSnapshot.docs[0]?.data() || {}),
            id: gptTestSettingsSnapshot.docs[0]?.id
        });
        this.gpt_question = new GptQuestionSettings({
            test: this,
            ...(gptQuestionSettingsSnapshot.docs[0]?.data() || {}),
            id: gptQuestionSettingsSnapshot.docs[0]?.id
        });
        this.test_settings = new TestPdfSettings({
            test: this,
            ...(testPdfSettingsSnapshot.docs[0]?.data() || {}),
            id: testPdfSettingsSnapshot.docs[0]?.id
        })


        // Load rubric points for each question
        for (const question of this.questions) {
            const pointsQuery = query(collection(db, 'rubric_points'), where("question_id", "==", question.id));
            const pointsSnapshot = await getDocs(pointsQuery);
            question.points = pointsSnapshot.docs.map(doc => new RubricPoint({
                question: question,
                ...doc.data(),
                target: this.targets.find(e => e.id == doc.data().target_id) || new Target({}),
                id: doc.id
            }));
        }

        // Load results, scans, and grade instances for each student
        for (const student of this.students) {
            const resultsQuery = query(collection(db, 'students_question_results'), where("student_id", "==", student.id));
            const resultsSnapshot = await getDocs(resultsQuery);

            student.results = await Promise.all(resultsSnapshot.docs.map(async (resultDoc) => {
                const resultData = resultDoc.data();
                const questionResult = new StudentQuestionResult({
                    student: student,
                    ...resultData,
                    id: resultDoc.id
                });

                // Load points for this result
                const pointsQuery = query(collection(db, 'students_points_results'), where("student_question_result_id", "==", resultDoc.id));
                const pointsSnapshot = await getDocs(pointsQuery);
                pointsSnapshot.forEach(pointDoc => {
                    questionResult.point_results[pointDoc.data().point_index] = new StudentPointResult({
                        student_result: questionResult,
                        ...pointDoc.data(),
                        id: pointDoc.id,
                    });
                });

                // Load grade instance
                const gradeQuery = query(collection(db, 'grade_instances'), where("student_question_result_id", "==", resultDoc.id));
                const gradeSnapshot = await getDocs(gradeQuery);
                if (gradeSnapshot.docs.length > 0) {
                    questionResult.grade_instance = new GradeInstance({
                        ...gradeSnapshot.docs[0].data(),
                        id: gradeSnapshot.docs[0].id,
                    });
                }

                //Get File
                const file = filesSnapshot.docs.find(e => e.data().student_question_result_id == questionResult.id)
                if (file) {
                    questionResult.scan.file = new File({
                        id: file.id,
                        test_id: file.data().test_id,
                        student_question_result_id: file.data().student_question_result_id,
                        location: file.data().location,
                        file_type: file.data().file_type,
                        is_stored: true
                    });
                }


                return questionResult;

            }));
        }
        //put files into the right test file fields
        filesSnapshot.docs.forEach(fileData => {
            const file = new File({
                id: fileData.id,
                test_id: fileData.data().test_id,
                student_question_result_id: fileData.data().student_question_result_id,
                location: fileData.data().location,
                file_type: fileData.data().file_type,
                is_stored: true, // Since it's loaded from DB, it's stored.
            });
            const file_type = file.file_type.split('.')[0]
            if (Object.keys(this.files).includes(file_type)) {
                this.files[file_type] = file
            }
        });

        return this; // Return the populated Test instance

        // } catch (error) {
        //     console.error("Error loading test from Firestore:", error);
        //     return null; // Or throw the error, depending on your error handling
        // }
    }

    getTestFileUrl() { // NEW - method to get test pdf url
        return this.files.test ? this.getDownloadURL(this.files.test) : null
    }
    getRubricFileUrl() { // NEW - method to get rubric pdf url
        return this.files.rubric ? this.getDownloadURL(this.files.rubric) : null
    }
    getStudentFileUrl() { // NEW - method to get student pdf url
        return this.files.students ? this.getDownloadURL(this.files.students) : null
    }

}


class Question extends FirestoreBase {
    constructor({
        test = new Test({}),
        id = null,
        question_number = "",
        question_text = "",
        question_context = "",
        answer_text = "",
        is_draw_question = false,
        points = [],
    }) {
        super('questions');
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

class RubricPoint extends FirestoreBase {
    constructor({
        question = new Question({}),
        id = null,
        point_text = "",
        point_name = "",
        point_weight = 1,
        point_index = 0,
        target = new Target({}),
        target_id = null
    }) {
        super('rubric_points');
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

class Target extends FirestoreBase {
    constructor({
        test = new Test({}),
        id = null,
        target_name = "",
        explanation = "",
    }) {
        super('targets');
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

class Student extends FirestoreBase {
    constructor({
        test = new Test({}),
        id = null,
        student_id = "",
        results = [],
        is_grading = false,
    }) {
        super('students');
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

class GradeInstance extends FirestoreBase {
    constructor({
        id = null,
        student_question_result = null,
        is_gpt = false,
        model = null,
        provider = null,
    }) {
        super('grade_instances');
        this.id = id;
        this.student_question_result = student_question_result;
        this.is_gpt = is_gpt
        this.model = model
        this.provider = provider
    }
}



class StudentQuestionResult extends FirestoreBase {
    constructor({
        id = getRandomID(),
        student = new Student({}),
        grade_instance = new GradeInstance({}),
        question_id = "",
        feedback = "",
        point_results = {},
        scan = { //Updated scan property
            base64Data: null //NEW
        },
        scan_base64 = null, //NEW
        is_grading = false,
        student_handwriting_percent = 0
    }) {
        super('students_question_results');
        this.id = id
        this.student = student
        this.grade_instance = grade_instance
        this.question_id = question_id
        this.feedback = feedback
        this.point_results = point_results
        // this.scan = new ScanQuestion({ //REMOVED File instance
        //     ...scan,
        //     file: scan.file
        // })
        this.scan_base64 = scan.base64Data || null //NEW, store base64 directly
        this.scan = { //NEW: quick fix for old code
            text: scan.text || "",
            question_number: scan.question_number || "",
            page: scan.page || null,
            is_loading: scan.is_loading || false,
            file: {
                base64Data: scan.base64Data || null
            },
            file_type: scan.file_type || "jpeg",

        }
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
                studentImage: this.question.is_draw_question ? this.scan.file.base64Data : undefined, // OLD: result.scan.file.base64Data
                studentImage: this.question.is_draw_question ? this.scan_base64 : undefined, // NEW: use base64 property
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

class StudentPointResult extends FirestoreBase {
    constructor({
        id = null,
        student_result = new StudentQuestionResult({}),
        has_point = null,
        feedback = "",
        point_index = "",
    }) {
        super('students_points_results');
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

class TestManager extends FirestoreBase {
    constructor() {
        super('tests');
        this.tests = [];
        this.loading = false;
        this.searchQuery = '';
    }

    async fetchTests() {
        this.loading = true;

        if (!currentUser) {
            console.error("No user logged in.");
            this.loading = false;
            return;
        }
        const userId = currentUser.uid;

        let q = query(this.dbCollection,
            where('user_id', '==', userId)
            // consider adding is_public filter here if needed for public tests
        );

        const querySnapshot = await getDocs(q);
        this.tests = querySnapshot.docs.map(doc => this.loadTestFromData({
            id: doc.id,
            ...doc.data()
        }));

        this.loading = false;
    }

    // Add method to load a single test (used by TestView)
    async fetchTest(testId) {
        this.loading = true
        const testDoc = await super.getById(testId);
        if (testDoc) {
            return this.loadTestFromData(testDoc);
        } else {
            return null;
        }
    }

    loadTestFromData(testData) {
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
        return test; // Incomplete - needs full data loading. Implement loading of children later if needed in TestManager.
    }


    async deleteTest(testId) {
        const testIndex = this.tests.findIndex(test => test.id === testId);
        if (testIndex === -1) {
            console.error("Test not found in TestManager.");
            return;
        }

        const test = this.tests[testIndex];

        await test.deleteFromDatabase(); // Use the delete method in Test class to handle cascading delete

        // Remove from the local array *only* if database deletion is successful
        this.tests.splice(testIndex, 1);
    }
    get filteredTests() {
        if (!this.searchQuery) {
            return this.tests;
        }
        const query = this.searchQuery.toLowerCase();
        return this.tests.filter(test =>
            test.test_settings.name.toLowerCase().includes(query)
        );
    }
}


export {
    User,
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
    TestManager,

}
// --- END OF FILE scan_api_classes.js ---
