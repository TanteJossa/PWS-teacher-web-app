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
        // this.file = new File({ ...file, file_type: 'png' }); // REMOVE File instance
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

class TestFile {
    constructor({
        name = null,
        id = null,
        fileType = null,
        localData = null,
        url = null,
        storage_path = null,
        data = null,
        raw = null,
    }) {
        this._name = name;
        this._id = id; // Firestore document ID
        this._fileType = fileType;
        this._localData = localData;
        this._url = url;
        this._storage_path = storage_path;
        this._data = data;
        this._raw = raw;
    }

    get url() {
        return this._url || (this._localData ? this._localData : null);
    }

    set url(value) {
        this._url = value;
    }

    get storage_path() {
        return this._storage_path;
    }

    set storage_path(value) {
        this._storage_path = value;
    }

    get data() {
        return this._data;
    }

    set data(value) {
        this._data = value;
    }

    get raw() {
        return this._raw;
    }

    set raw(value) {
        this._raw = value;
        if (value) {
            this._localData = URL.createObjectURL(value);
        }
    }

    get isUploaded() {
        return !!this._storage_path && !!this._url;
    }

    toFirestore() {
        return {
            fileType: `${this._fileType}.pdf`,
            location: this._storage_path,
            url: this._url,
            name: this._name
        };
    }

    fromFirestore(data) {
        this._url = data.url;
        this._storage_path = data.location;
        return this;
    }

    async deleteFromStorage() {
        if (this._storage_path) {
            const storageRef = ref(storage, this._storage_path);
            try {
                await deleteObject(storageRef);
                this._storage_path = null;
                this._url = null;
                return true;
            } catch (error) {
                console.error(`Error deleting file from storage:`, error);
                return false;
            }
        }
        return true;
    }

    clear() {
        if (this._localData) {
            URL.revokeObjectURL(this._localData);
        }
        this._localData = null;
        this._url = null;
        this._storage_path = null;
        this._data = null;
        this._raw = null;
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



    }) {
        super('tests');
        this.id = id
        this.user_id = user_id;
        this.name = name
        this.files = {
            test: new TestFile({
                ...(files.test || {})
            }),
            rubric: new TestFile({
                ...(files.rubric || {})
            }),
            students: new TestFile({
                ...(files.students || {})
            }),
        };
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



    }
    get modelConfig() {
        return {
            google: {
                "gemini-2.0-flash": {
                    test_recognition: "snel, nieuw en geeft soms error",
                    test_generation: "snel, nieuw en geeft soms error",
                    text_recognition: "snel, nieuw en geeft soms error",
                    grading: "snel, nieuw en geeft soms error",
                },
                "gemini-2.5-pro-exp-03-25": {
                    test_recognition: "nieuw, zeer langzaam en werkt soms",
                    test_generation: "nieuw, zeer langzaam en werkt soms",
                    text_recognition: "nieuw, zeer langzaam en werkt soms",
                    grading: "nieuw, zeer langzaam en werkt soms",
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
                'gemini-2.0-flash-lite-preview-02-05': {
                    test_recognition: "snel",
                    test_generation: "snel",
                    text_recognition: "snel",
                    grading: "snel",
                },
                'gemma-3-27b-it': {
                    test_recognition: "open source google",
                    test_generation: "open source google",
                    text_recognition: "open source google",
                    grading: "open source google",
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
            },

            anthropic: {
                "claude-3-5-sonnet-20241022": {},
                "claude-3-5-haiku-20241022": {},
                "claude-3-7-sonnet-20250219": {},

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
                let text = ""
                if (this.modelConfig[this.gpt_provider]?. [model]?. [action]?.length > 0) {
                    text = '(' + (this.modelConfig[this.gpt_provider][model]?. [action] || '') + ')'
                }

                return {
                    value: model,
                    title: model + text
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
    async uploadFile(file, fileType) {
        if (!file || !fileType) {
            console.error("Test: Missing file or fileType for upload");
            return false;
        }

        console.log(`Test: Uploading ${fileType} file...`);

        try {
            // Create storage reference
            const storagePath = `tests/${this.id}/pdfs/${fileType}.pdf`;
            const storageRef = ref(storage, storagePath);

            // Upload the file
            await uploadBytes(storageRef, file, {
                contentType: 'application/pdf'
            });

            // Get the download URL
            const downloadURL = await getDownloadURL(storageRef);

            // Update the files object
            this.files[fileType].url = downloadURL;

            console.log(`Test: Successfully uploaded ${fileType} file`);
            return true;
        } catch (error) {
            console.error(`Test: Error uploading ${fileType} file:`, error);
            return false;
        }
    }
    async loadDataFromPdf(fileType) {
        if (!this.files[fileType]?.url) {
            console.error(`Test: No ${fileType} file available`);
            return false;
        }

        console.log(`Test: Loading data from ${fileType} PDF...`);
        this.loading.pdf_data = true;

        try {
            const blob = await this.fetchFileAsBlob(this.files[fileType].url);

            if (["rubric", "test"].includes(fileType)) {
                this.files[fileType].data = await globals.$extractTextAndImages(blob);
            } else if (fileType === "students") {
                const imageData = await globals.$pdfToBase64Images(blob);
                this.files[fileType].data = imageData;

                if (imageData) {
                    imageData.forEach(page => {
                        this.addPage(page);
                    });
                }
            }

            console.log(`Test: Successfully loaded data from ${fileType} PDF`);
            return true;
        } catch (error) {
            console.error(`Test: Error loading PDF data:`, error);
            return false;
        } finally {
            this.loading.pdf_data = false;
        }
    }
    async fetchFileAsBlob(url) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.responseType = 'blob';

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(xhr.response); // Resolve with the blob
                } else {
                    reject(new Error(`Request failed with status: ${xhr.status}`)); // Reject if status is not OK
                }
            };

            xhr.onerror = () => {
                reject(new Error('Network error')); // Reject on network errors
            };

            xhr.open('GET', url);
            xhr.send();
        });

    }
    async generateGptTest() {
        this.loading.structure = true
        const request_text = this.gpt_test.request_text


        try {

            var result = await apiRequest('/gpt-test', {
                requestText: request_text,
                model: this.gpt_model,
                provider: this.gpt_provider,
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
                },
                provider: this.gpt_provider,
                model: this.gpt_model
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
    // FIREBASE
    async saveToDatabase() {
        this.loading.save_to_database = true;
        console.log("Test: Starting Save to Firestore...");

        const user = currentUser.value; // Get the current user reactive value
        if (!user || !user.uid) {
            console.error("Test: No user logged in or UID missing.");
            this.loading.save_to_database = false;
            return false;
        }
        // Ensure this.user_id is set correctly before proceeding
        if (!this.user_id) {
            this.user_id = user.uid;
        } else if (this.user_id !== user.uid) {
            // This case should ideally not happen if loading/creation is correct
            console.warn(`Test: Instance user_id (${this.user_id}) differs from current user (${user.uid}). Using current user.`);
            this.user_id = user.uid;
        }

        let testId = this.id;

        try {
            // --- PRE-SAVE OPERATIONS ---

            // 0. Assign IDs to new children (if needed by subsequent steps like cleanup or linking)
            // This is now handled within the specific save methods (e.g., saveStudentsResultsAndFiles)
            // Ensure targets and questions have IDs before saving points that reference them.
            this.targets.forEach(target => {
                if (!target.id) target.id = doc(collection(db, 'targets')).id;
            });
            this.questions.forEach(question => {
                if (!question.id) question.id = doc(collection(db, 'questions')).id;
            });
            this.questions.forEach(q => q.points.forEach(point => {
                if (!point.id) point.id = doc(collection(db, 'rubric_points')).id;
            }));
            this.students.forEach(student => {
                if (!student.id) student.id = doc(collection(db, 'students')).id;
                student.results.forEach(result => {
                    if (!result.id) result.id = doc(collection(db, 'students_question_results')).id;
                    Object.values(result.point_results).forEach(pr => {
                        if (!pr.id) pr.id = doc(collection(db, 'students_points_results')).id;
                    });
                    if (result.grade_instance && !result.grade_instance.id) {
                        result.grade_instance.id = doc(collection(db, 'grade_instances')).id;
                    }
                })
            });
            // Note: Pages/Sections don't have persistent Firestore IDs in the current design.


            // 1. Save Test Metadata (Get or Create Test ID)
            const testData = {
                user_id: this.user_id, // This *must* be present.
                name: this.name || "Untitled Test", // Default name
                is_public: this.is_public || false,
                gpt_provider: this.gpt_provider,
                gpt_model: this.gpt_model,
                grade_rules: this.grade_rules || "",
                // Store only necessary parts of test_data_result, excluding large/redundant data if needed
                test_data_result: this.test_data_result ? {
                    targets: this.test_data_result.targets || [], // Keep targets/questions if they are identifiers/lightweight
                    questions: this.test_data_result.questions || [],
                    // Exclude potentially large base64 data if it was part of the original structure
                } : null,
                updated_at: new Date(), // Use Firestore Server Timestamp in production if possible
                // Store file metadata using the TestFile's toFirestore method
                files: {
                    test: this.files.test.toFirestore(),
                    rubric: this.files.rubric.toFirestore(),
                    students: this.files.students.toFirestore(),
                }
            };

            if (testId) {
                await super.update(testId, testData); // Update existing test
                console.log(`Test: Test Metadata Updated. Test ID: ${testId}`);
            } else {
                // Add new test and get the new ID
                const docRef = await addDoc(this.dbCollection, testData);
                testId = docRef.id;
                this.id = testId; // Update instance with new ID
                console.log(`Test: Test Metadata Created. Test ID: ${testId}`);
            }

            // --- CRUCIAL: Ensure testId is valid before proceeding ---
            if (!testId) {
                throw new Error("Failed to get or create a valid Test ID.");
            }


            // 2. Upload/Update Primary Files (Test, Rubric, Students PDFs)
            // This also updates the URL/storage_path in the this.files objects
            await this.saveTestFiles(testId);
            // Update the main test document AGAIN to store the potentially updated file URLs/paths
            await super.update(testId, {
                'files.test': this.files.test.toFirestore(),
                'files.rubric': this.files.rubric.toFirestore(),
                'files.students': this.files.students.toFirestore(),
                updated_at: new Date(),
            });
            console.log(`Test: Test file metadata updated after potential uploads. Test ID: ${testId}`);


            // 3. Save Settings Sub-documents
            await this.gpt_test.saveToFirestore(testId);
            await this.gpt_question.saveToFirestore(testId);
            await this.test_settings.saveToFirestore(testId);

            // --- Child Management ---
            // 4. Cleanup Unused Children (Firestore documents and associated Storage files)
            // Do this *before* saving the current children to avoid deleting things you're about to add/update
            await this.cleanupUnusedChildren(testId);

            // 5. Save Current Children (Targets, Questions, Points, Students, Results, etc.)
            // These methods use batch writes and handle Storage uploads for relevant items (e.g., student answers)
            await this.saveTargetsAndQuestions(testId); // Saves Targets, Questions, RubricPoints
            await this.saveStudentsResultsAndFiles(testId); // Saves Students, Results, PointResults, GradeInstances, and uploads student answer images

            // 6. Save Pages and Sections (Currently only uploads images to Storage, no Firestore metadata)
            // If you added Firestore metadata saving for pages/sections, call that method here.
            await this.savePagesAndSections(testId); // Uploads page/section images if base64 is present


            console.log("Test: Save to Firestore and Storage Completed Successfully. Test ID:", testId);
            this.loading.save_to_database = false;
            return true;

        } catch (e) {
            console.error("Test: Exception during Firestore save:", e);
            this.loading.save_to_database = false;
            // Consider more granular error reporting or rollback logic if necessary
            return false;
        }
    }

    async cleanupUnusedChildren(testId) {
        if (!testId) {
            console.error("Test: cleanupUnusedChildren requires a testId.");
            return;
        }
        console.log(`Test: Starting cleanup for unused children of Test ID: ${testId}`);
        const batch = writeBatch(db); // Use a batch for efficient Firestore deletions
        const storageDeletePromises = []; // Collect promises for Storage deletions

        try {
            // --- Get Current Child IDs from the Instance ---
            const currentQuestionIds = new Set(this.questions.map(q => q.id).filter(id => id));
            const currentRubricPointIds = new Set(this.questions.flatMap(q => q.points.map(p => p.id)).filter(id => id));
            const currentTargetIds = new Set(this.targets.map(t => t.id).filter(id => id));
            const currentStudentIds = new Set(this.students.map(s => s.id).filter(id => id));
            const currentResultIds = new Set(this.students.flatMap(s => s.results.map(r => r.id)).filter(id => id));
            const currentPointResultIds = new Set(this.students.flatMap(s => s.results.flatMap(r => Object.values(r.point_results).map(pr => pr.id))).filter(id => id));
            const currentGradeInstanceIds = new Set(this.students.flatMap(s => s.results.map(r => r.grade_instance?.id)).filter(id => id));
            // Note: Pages/Sections are not tracked by ID in Firestore in the current design.

            // --- Questions & Rubric Points ---
            console.log("Test Cleanup: Checking Questions and Rubric Points...");
            const questionsQuery = query(collection(db, 'questions'), where("test_id", "==", testId));
            const questionsSnapshot = await getDocs(questionsQuery);
            for (const doc of questionsSnapshot.docs) {
                if (!currentQuestionIds.has(doc.id)) {
                    console.log(`Test Cleanup: Deleting orphaned question: ${doc.id}`);
                    batch.delete(doc.ref);

                    // Also delete associated rubric_points for the orphaned question
                    const pointsQuery = query(collection(db, 'rubric_points'), where("question_id", "==", doc.id));
                    const pointsSnapshot = await getDocs(pointsQuery);
                    pointsSnapshot.forEach(pointDoc => {
                        console.log(`Test Cleanup: Deleting orphaned rubric point (due to question delete): ${pointDoc.id}`);
                        batch.delete(pointDoc.ref);
                    });
                } else {
                    // If question exists, check its points
                    const pointsQuery = query(collection(db, 'rubric_points'), where("question_id", "==", doc.id));
                    const pointsSnapshot = await getDocs(pointsQuery);
                    pointsSnapshot.forEach(pointDoc => {
                        if (!currentRubricPointIds.has(pointDoc.id)) {
                            console.log(`Test Cleanup: Deleting orphaned rubric point: ${pointDoc.id}`);
                            batch.delete(pointDoc.ref);
                        }
                    });
                }
            }

            // --- Targets ---
            console.log("Test Cleanup: Checking Targets...");
            const targetQuery = query(collection(db, 'targets'), where("test_id", "==", testId));
            const targetSnapshot = await getDocs(targetQuery);
            targetSnapshot.forEach(doc => {
                if (!currentTargetIds.has(doc.id)) {
                    console.log(`Test Cleanup: Deleting orphaned target: ${doc.id}`);
                    batch.delete(doc.ref);
                }
            });

            // --- Students (and their related data/files) ---
            console.log("Test Cleanup: Checking Students and related data/files...");
            const studentQuery = query(collection(db, 'students'), where("test_id", "==", testId));
            const studentSnapshot = await getDocs(studentQuery);
            for (const studentDoc of studentSnapshot.docs) {
                if (!currentStudentIds.has(studentDoc.id)) {
                    console.log(`Test Cleanup: Deleting orphaned student: ${studentDoc.id}`);
                    batch.delete(studentDoc.ref); // Delete the student document

                    // Find and delete all related data for this student
                    const resultsQuery = query(collection(db, "students_question_results"), where("student_id", "==", studentDoc.id));
                    const resultSnapshot = await getDocs(resultsQuery);
                    for (const resultDoc of resultSnapshot.docs) {
                        console.log(`Test Cleanup: Deleting orphaned student result (due to student delete): ${resultDoc.id}`);
                        batch.delete(resultDoc.ref); // Delete the result document

                        // Delete associated point results
                        const pointsQuery = query(collection(db, 'students_points_results'), where("student_question_result_id", "==", resultDoc.id));
                        const pointsSnapshot = await getDocs(pointsQuery);
                        pointsSnapshot.forEach(pointDoc => {
                            console.log(`Test Cleanup: Deleting orphaned point result (due to result delete): ${pointDoc.id}`);
                            batch.delete(pointDoc.ref);
                        });

                        // Delete associated grade instances
                        const gradeQuery = query(collection(db, 'grade_instances'), where("student_question_result_id", "==", resultDoc.id));
                        const gradeSnapshot = await getDocs(gradeQuery);
                        gradeSnapshot.forEach(gradeDoc => {
                            console.log(`Test Cleanup: Deleting orphaned grade instance (due to result delete): ${gradeDoc.id}`);
                            batch.delete(gradeDoc.ref);
                        });

                        // Schedule deletion of the associated student answer image from Storage
                        const storagePath = `tests/${testId}/student_answers/${resultDoc.id}/answer.png`;
                        const storageRef = ref(storage, storagePath);
                        console.log(`Test Cleanup: Scheduling Storage delete for orphaned student answer: ${storagePath}`);
                        storageDeletePromises.push(deleteObject(storageRef).catch(err => {
                            // Log error but don't block Firestore cleanup if file not found or other issue
                            if (err.code !== 'storage/object-not-found') {
                                console.error(`Test Cleanup: Failed to delete Storage object ${storagePath}:`, err);
                            }
                        }));
                    }
                } else {
                    // If student exists, check their results
                    const resultsQuery = query(collection(db, "students_question_results"), where("student_id", "==", studentDoc.id));
                    const resultSnapshot = await getDocs(resultsQuery);
                    for (const resultDoc of resultSnapshot.docs) {
                        if (!currentResultIds.has(resultDoc.id)) {
                            console.log(`Test Cleanup: Deleting orphaned student result: ${resultDoc.id}`);
                            batch.delete(resultDoc.ref); // Delete the result document

                            // Delete associated point results, grades, and files for this specific orphaned result
                            const pointsQuery = query(collection(db, 'students_points_results'), where("student_question_result_id", "==", resultDoc.id));
                            const pointsSnapshot = await getDocs(pointsQuery);
                            pointsSnapshot.forEach(pointDoc => {
                                console.log(`Test Cleanup: Deleting orphaned point result (due to result delete): ${pointDoc.id}`);
                                batch.delete(pointDoc.ref);
                            });
                            const gradeQuery = query(collection(db, 'grade_instances'), where("student_question_result_id", "==", resultDoc.id));
                            const gradeSnapshot = await getDocs(gradeQuery);
                            gradeSnapshot.forEach(gradeDoc => {
                                console.log(`Test Cleanup: Deleting orphaned grade instance (due to result delete): ${gradeDoc.id}`);
                                batch.delete(gradeDoc.ref);
                            });
                            const storagePath = `tests/${testId}/student_answers/${resultDoc.id}/answer.png`;
                            const storageRef = ref(storage, storagePath);
                            console.log(`Test Cleanup: Scheduling Storage delete for orphaned student answer: ${storagePath}`);
                            storageDeletePromises.push(deleteObject(storageRef).catch(err => {
                                if (err.code !== 'storage/object-not-found') {
                                    console.error(`Test Cleanup: Failed to delete Storage object ${storagePath}:`, err);
                                }
                            }));
                        } else {
                            // If result exists, check its point results and grade instance
                            const pointsQuery = query(collection(db, 'students_points_results'), where("student_question_result_id", "==", resultDoc.id));
                            const pointsSnapshot = await getDocs(pointsQuery);
                            pointsSnapshot.forEach(pointDoc => {
                                if (!currentPointResultIds.has(pointDoc.id)) {
                                    console.log(`Test Cleanup: Deleting orphaned point result: ${pointDoc.id}`);
                                    batch.delete(pointDoc.ref);
                                }
                            });
                            const gradeQuery = query(collection(db, 'grade_instances'), where("student_question_result_id", "==", resultDoc.id));
                            const gradeSnapshot = await getDocs(gradeQuery);
                            gradeSnapshot.forEach(gradeDoc => {
                                if (!currentGradeInstanceIds.has(gradeDoc.id)) {
                                    console.log(`Test Cleanup: Deleting orphaned grade instance: ${gradeDoc.id}`);
                                    batch.delete(gradeDoc.ref);
                                }
                            });
                        }
                    }
                }
            }

            // --- Settings Cleanup (Optional - usually only one per test) ---
            // If you enforce only one settings doc per test, you could add cleanup here,
            // but often just overwriting (set merge:true) is sufficient.

            // --- Page/Section File Cleanup (More Complex) ---
            // Since pages/sections aren't stored with IDs in Firestore, cleaning their
            // Storage files requires listing directories and comparing. This is more intensive.
            // Example sketch (run carefully, maybe separate utility):
            /*
            const currentSectionIds = new Set(this.pages.flatMap(p => p.sections.map(s => s.id)).filter(id => id)); // Assuming sections get *temporary* IDs
            const sectionsDirRef = ref(storage, `tests/${testId}/sections`);
            const listResult = await listAll(sectionsDirRef);
            for (const itemPrefix of listResult.prefixes) { // Prefixes are the section ID folders
                const sectionId = itemPrefix.name;
                if (!currentSectionIds.has(sectionId)) {
                    console.log(`Test Cleanup: Found orphaned section folder in Storage: ${sectionId}. Deleting contents...`);
                    const sectionFilesList = await listAll(itemPrefix);
                    sectionFilesList.items.forEach(fileRef => {
                         console.log(`Test Cleanup: Scheduling delete for orphaned section file: ${fileRef.fullPath}`);
                        storageDeletePromises.push(deleteObject(fileRef).catch(err => console.error(...)));
                    });
                }
            }
            // Similar logic for page folders if they exist `tests/${testId}/pages`
            */
            console.warn("Test Cleanup: Storage cleanup for orphaned Pages/Sections is not fully implemented due to lack of persistent IDs. Manual cleanup might be needed for Storage folders `tests/${testId}/pages` and `tests/${testId}/sections`.");


            // --- Commit Firestore Deletions ---
            console.log("Test Cleanup: Committing Firestore batch deletions...");
            await batch.commit();
            console.log("Test Cleanup: Firestore batch deletions committed.");

            // --- Wait for Storage Deletions ---
            console.log(`Test Cleanup: Waiting for ${storageDeletePromises.length} Storage deletions...`);
            await Promise.all(storageDeletePromises);
            console.log("Test Cleanup: Storage deletions completed (or attempted).");

            console.log(`Test Cleanup: Finished cleanup for Test ID: ${testId}`);

        } catch (error) {
            console.error(`Test Cleanup: Error during cleanup for test ${testId}:`, error);
            // Don't re-throw usually, allow the main save operation to potentially continue or fail separately
        }
    }

    async saveTestFiles(testId) {
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save files.");
            return false;
        }

        try {
            const fileTypes = ['test', 'rubric', 'students'];

            for (const fileType of fileTypes) {
                const file = this.files[fileType];
                if (file.raw && !file.isUploaded) {
                    const storagePath = `tests/${testId}/pdfs/${fileType}.pdf`;
                    const storageRef = ref(storage, storagePath);

                    await uploadBytes(storageRef, file.raw, {
                        contentType: 'application/pdf'
                    });

                    const downloadURL = await getDownloadURL(storageRef);

                    file.url = downloadURL;
                    file.storage_path = storagePath;

                    await addDoc(collection(db, 'files'), {
                        test_id: testId,
                        location: storagePath,
                        file_type: 'pdf'
                    });
                }
            }

            return true;
        } catch (error) {
            console.error("Test: Error saving files:", error);
            return false;
        }
    }

    async savePagesAndSections(testId) {
        console.log("Test: Starting Unified Pages and Sections Save. Test ID:", testId);
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save.");
            return false;
        }

        // Promises for Cloud Storage uploads
        const uploadPromises = [];

        try {
            for (const page of this.pages) {
                // --- Page Image Handling (Upload to Storage only) ---
                const isBase64 = typeof page.image === 'string' && page.image.startsWith('data:image/png;base64,');
                let pageStoragePath = null; // To track if we have a storage path

                if (isBase64) {
                    // 1. Prepare Page Image Upload
                    pageStoragePath = `tests/${testId}/pages/${page.id}/full.png`;
                    const storageRef = ref(storage, pageStoragePath);
                    // Use Blob in browser environment, Buffer in Node.js
                    let uploadData;

                    // Assuming Node.js environment based on original code using Buffer
                    uploadData = Buffer.from(page.image.split(',')[1], 'base64');



                    // Add upload task to promises array
                    uploadPromises.push(
                        uploadBytes(storageRef, uploadData, { // Use uploadData (Buffer or Blob)
                            contentType: 'image/png'
                        }).then(() => {
                            console.log(`Test: Uploaded page ${page.id} image to ${pageStoragePath}`);
                        }).catch(err => {
                            console.error(`Test: Failed to upload page ${page.id} image:`, err);
                            throw err; // Propagate error to Promise.all
                        })
                    );

                } else if (typeof page.image === 'string' && page.image.length > 0) {
                    // Assume page.image is an existing URL/storage path. No upload needed.
                    console.log(`Test: Page ${page.id} image uses existing URL/path: ${page.image}. No upload performed.`);
                    pageStoragePath = page.image; // Keep track of the existing path/URL
                } else {
                    console.warn(`Test: Page ${page.id} has no valid image data or URL. No image saved.`);
                }


                // --- Section Handling (within page loop) ---
                for (const section of page.sections) {
                    // 1. Save/Update Section Metadata to Firestore 'sections' collection
                    const isNewSection = !section.id;

                    const sectionData = {
                        test_id: testId,
                        page_id: page.id,
                        question_number: section.question_number,
                        student_id: section.student_id,
                    };





                    // 2. Define and Process Section Image Files (Upload to Storage only)
                    const sectionFilesToProcess = [
                        // Define the different image types associated with a section
                        {
                            base64Data: section.base64_full,
                            fileType: 'section_full'
                        },
                        {
                            base64Data: section.base64_section_finder,
                            fileType: 'section_finder'
                        },
                        {
                            base64Data: section.base64_question_selector,
                            fileType: 'section_question_selector'
                        },
                        {
                            base64Data: section.base64_answer,
                            fileType: 'section_answer'
                        },
                    ];

                    for (const fileDetail of sectionFilesToProcess) {
                        // Only process if there's new base64 data for this file type
                        if (fileDetail.base64Data && typeof fileDetail.base64Data === 'string' && fileDetail.base64Data.startsWith('data:image/png;base64,')) {

                            // Prepare Upload Path (deterministic)
                            const sectionStoragePath = `tests/${testId}/sections/${section.id}/${fileDetail.fileType}.png`;
                            const storageRef = ref(storage, sectionStoragePath);

                            // Use Blob in browser environment, Buffer in Node.js
                            let sectionUploadData;

                            sectionUploadData = Buffer.from(fileDetail.base64Data.split(',')[1], 'base64');



                            // Add upload task to promises array
                            uploadPromises.push(
                                uploadBytes(storageRef, sectionUploadData, { // Use sectionUploadData
                                    contentType: 'image/png'
                                }).then(() => {
                                    console.log(`Test: Uploaded ${fileDetail.fileType} for section ${section.id} to ${sectionStoragePath}`);
                                    // Optionally clear base64 data from memory after upload attempt starts
                                    // fileDetail.base64Data = null; // Be careful if you need the data later in this function
                                }).catch(err => {
                                    console.error(`Test: Failed to upload ${fileDetail.fileType} for section ${section.id}:`, err);
                                    throw err; // Propagate error
                                })
                            );

                            // No Firestore 'files' collection interaction needed here

                            // Clear base64 data from the section object in memory (optional, saves memory)
                            // Find the key corresponding to the base64 data (e.g., 'base64_full') and set it to null
                            for (const key in section) {
                                if (section[key] === fileDetail.base64Data) {
                                    section[key] = null;
                                    break;
                                }
                            }

                        }
                    }
                }
            }

            // --- Execute Uploads and Batch Write ---
            console.log(`Test: Waiting for ${uploadPromises.length} file uploads...`);
            await Promise.all(uploadPromises); // Wait for all Storage uploads to complete
            console.log("Test: All file uploads completed.");

            return true;

        } catch (e) {
            console.error("Test: Exception during unified save:", e);
            // Consider adding more specific error handling or cleanup if needed
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


    async saveStudentsResultsAndFiles(testId) {
        console.log("Test: Starting Combined Students, Results, and Files Save. Test ID:", testId)
        if (!testId) {
            console.error("Test: Test ID is missing. Cannot save students, results, and files.");
            return false;
        }

        const batch = writeBatch(db); // Single batch for all Firestore metadata writes
        const uploadPromises = []; // Store promises for all student answer file uploads

        try {
            // --- Fetch Existing Child IDs (Optional but good for updates) ---
            // You might fetch existing IDs beforehand if complex update/delete logic is needed,
            // but for set({merge: true}), it's often sufficient to rely on the object's current ID.

            for (const student of this.students) {
                // --- Save/Update Student Metadata ---
                const studentRef = student.id ? doc(db, 'students', student.id) : doc(collection(db, 'students'));
                if (!student.id) {
                    student.id = studentRef.id; // *** Assign new Firestore-generated ID back ***
                }
                const studentData = {
                    test_id: testId,
                    student_id: student.student_id || "-1", // Use external ID or default
                    // Add any other student-level metadata here if needed
                };
                batch.set(studentRef, studentData, {
                    merge: true
                }); // Add student save to batch

                // --- Process StudentQuestionResults ---
                for (const result of student.results) {
                    // *** Ensure student.id is assigned before using it here if the student was new ***
                    if (!student.id) {
                        console.error(`Critical Error: New student object missing Firestore ID before processing results. Student Identifier: ${student.student_id}`);
                        continue
                        // throw new Error(`Student Firestore ID missing for student ${student.student_id}`);
                    }

                    const resultRef = result.id ? doc(db, 'students_question_results', result.id) : doc(collection(db, 'students_question_results'));
                    if (!result.id) {
                        result.id = resultRef.id; // *** Assign new Firestore-generated ID back ***
                    }

                    // --- Upload Student Answer Scan Image (if new base64 exists) ---
                    // Use result.scan_base64 as the primary source
                    let imageDataToUpload = result.scan_base64;

                    // Fallback to the older structure if necessary (optional, remove if not needed)
                    if (!imageDataToUpload && result.scan?.file?.base64Data) {
                        console.warn(`Test: Using fallback scan.file.base64Data for result ${result.id}. Consider migrating to scan_base64.`);
                        imageDataToUpload = result.scan.file.base64Data;
                    }


                    if (imageDataToUpload && typeof imageDataToUpload === 'string' && imageDataToUpload.startsWith('data:image/png;base64,')) {
                        // *** Ensure result.id is assigned before using it in the path ***
                        if (!result.id) {
                            console.error(`Critical Error: New result object missing Firestore ID before image upload. Question ID: ${result.question_id}, Student ID: ${student.student_id}`);
                            continue
                            // throw new Error(`Result Firestore ID missing for question ${result.question_id}, student ${student.student_id}`);
                        }

                        const storagePath = `tests/${testId}/student_answers/${result.id}/answer.png`; // Deterministic path
                        const storageRef = ref(storage, storagePath);

                        // Convert base64 to data suitable for upload
                        // Assuming a Node.js environment (like Cloud Functions) based on original code using Buffer
                        // If in BROWSER, use Blob: const blob = await (await fetch(imageDataToUpload)).blob();
                        let uploadData;
                        try {
                            uploadData = Buffer.from(imageDataToUpload.split(',')[1], 'base64');
                        } catch (bufferError) {
                            console.error(`Test: Error creating Buffer from base64 for result ${result.id}:`, bufferError);
                            // Decide how to handle: skip upload, throw error?
                            // Let's skip upload for this specific image if Buffer creation fails
                            uploadData = null; // Ensure it doesn't proceed to upload
                        }


                        if (uploadData) {
                            // Add upload task to promises array
                            uploadPromises.push(
                                uploadBytes(storageRef, uploadData, {
                                    contentType: 'image/png'
                                }).then(() => {
                                    console.log(`Test: Uploaded student answer scan for result ${result.id} to ${storagePath}`);
                                    // Optionally clear base64 data from memory AFTER upload promise added
                                    result.scan_base64 = null;
                                    if (result.scan?.file) result.scan.file.base64Data = null; // Clear fallback too
                                }).catch(err => {
                                    console.error(`Test: Failed to upload student answer scan for result ${result.id} to ${storagePath}:`, err);
                                    // Allow other uploads/writes to continue, but log the specific failure.
                                    // Do NOT throw err here unless you want the whole batch to fail on one image upload error.
                                })
                            );
                            // No interaction with a separate 'files' collection for student answers is needed here.
                            // The location is deterministic and derivable.
                        }

                    } else if (imageDataToUpload) {
                        // Log if scan data exists but isn't a valid base64 data URI
                        console.warn(`Test: Result ${result.id} has image data, but it's not a valid 'data:image/png;base64,...' string. Skipping upload.`);
                        // Decide if you want to clear invalid data:
                        // result.scan_base64 = null;
                        // if(result.scan?.file) result.scan.file.base64Data = null;
                    }

                    // --- Save/Update StudentQuestionResult Metadata ---
                    // Note: We DO NOT store the storagePath in Firestore. It's derived from testId and result.id.
                    const resultData = {
                        test_id: testId,
                        student_id: student.id, // Link to the student document using Firestore ID
                        question_id: result.question_id, // Link to the question document
                        feedback: result.feedback || "", // Default to empty string
                        student_handwriting_percent: result.student_handwriting_percent || 0,
                        scan_text: result.scan?.text || "", // Store extracted text if available
                        // Add other relevant fields from StudentQuestionResult
                    };
                    batch.set(resultRef, resultData, {
                        merge: true
                    }); // Add result metadata save to batch


                    // --- Process StudentPointResults ---
                    // *** Ensure result.id is assigned before using it here if the result was new ***
                    if (!result.id) {
                        console.error(`Critical Error: New result object missing Firestore ID before processing points. Question ID: ${result.question_id}, Student ID: ${student.student_id}`);
                        // throw new Error(`Result Firestore ID missing for question ${result.question_id}, student ${student.student_id}`);
                        continue;
                    }
                    // Iterate through the point_results *object*
                    for (const pointIndexStr in result.point_results) {
                        if (Object.hasOwnProperty.call(result.point_results, pointIndexStr)) {
                            const pointResult = result.point_results[pointIndexStr];
                            if (!pointResult) {
                                console.warn(`Test: Missing point result object for index ${pointIndexStr} in result ${result.id}`);
                                continue; // Skip if the entry is somehow null/undefined
                            }

                            const pointResultRef = pointResult.id ? doc(db, 'students_points_results', pointResult.id) : doc(collection(db, 'students_points_results'));
                            if (!pointResult.id) {
                                pointResult.id = pointResultRef.id; // *** Assign new Firestore-generated ID back ***
                            }
                            const pointResultData = {
                                student_question_result_id: result.id, // Link to the parent result document
                                // Ensure point_index is stored correctly (should match the key)
                                point_index: parseInt(pointIndexStr, 10), // Convert key back to number if needed, or use pointResult.point_index
                                has_point: pointResult.has_point === true, // Ensure boolean
                                feedback: pointResult.feedback || "", // Default to empty string
                                // Include point_id from RubricPoint if needed for easier querying (denormalization)
                                // point_id: pointResult.point?.id || null // Get the original RubricPoint ID
                            };
                            batch.set(pointResultRef, pointResultData, {
                                merge: true
                            }); // Add point result save to batch
                        }
                    }


                    // --- Process Grade Instance ---
                    if (result.grade_instance) { // Check if grade_instance exists
                        // *** Ensure result.id is assigned before using it here if the result was new ***
                        if (!result.id) {
                            console.error(`Critical Error: New result object missing Firestore ID before processing grade instance. Question ID: ${result.question_id}, Student ID: ${student.student_id}`);
                            continue
                            // throw new Error(`Result Firestore ID missing for question ${result.question_id}, student ${student.student_id}`);
                        }

                        const gradeInstanceRef = result.grade_instance.id ? doc(db, 'grade_instances', result.grade_instance.id) : doc(collection(db, 'grade_instances'));
                        if (!result.grade_instance.id) {
                            result.grade_instance.id = gradeInstanceRef.id; // *** Assign new Firestore-generated ID back ***
                        }
                        const gradeInstanceData = {
                            student_question_result_id: result.id, // Link to the parent result document
                            is_gpt: result.grade_instance.is_gpt || false,
                            model: result.grade_instance.model || null,
                            provider: result.grade_instance.provider || null,
                        };
                        batch.set(gradeInstanceRef, gradeInstanceData, {
                            merge: true
                        }); // Add grade instance save to batch
                    } else {
                        // Optional: Decide if you want to explicitly delete an existing grade instance if result.grade_instance is now null/undefined
                        // const gradeQuery = query(collection(db, 'grade_instances'), where("student_question_result_id", "==", result.id));
                        // getDocs(gradeQuery).then(snapshot => snapshot.forEach(doc => batch.delete(doc.ref)));
                        console.warn(`Test: Result ${result.id} is missing grade_instance data. No grade instance saved/updated.`);
                    }
                } // End of results loop
            } // End of students loop

            // --- Execute Uploads and Batch Write ---
            console.log(`Test: Waiting for ${uploadPromises.length} student answer file uploads...`);
            // Wait for all storage uploads to attempt completion.
            // Promise.allSettled might be better if you want to know which uploads failed
            // but still proceed with the Firestore batch if some succeed.
            await Promise.all(uploadPromises);
            console.log("Test: All pending student answer file uploads attempted.");

            console.log("Test: Committing Firestore batch write for students, results, points, and grade instances...");
            await batch.commit(); // Commit all Firestore metadata changes atomically

            console.log("Test: Combined Students, Results, and Files Save completed successfully. Test ID:", testId);
            return true;

        } catch (e) {
            console.error("Test: Exception during combined students/results/files save:", e);
            // Consider adding more specific error handling or cleanup if needed
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

    // Inside the Test class, add the following method:
    // Updated loadFromFirestore method
    async loadFromFirestore(testId) {
        if (!testId) {
            console.error("Test.loadFromFirestore: testId is required.");
            return null;
        }
        console.log(`Test: Loading test data from Firestore for ID: ${testId}`);
        this.loading.save_to_database = true; // Indicate loading state

        try {
            // 1. Fetch the main test document
            const testDoc = await super.getById(testId);
            if (!testDoc) {
                console.warn(`Test with ID ${testId} not found.`);
                this.loading.save_to_database = false;
                return null;
            }

            // 2. Populate the Test instance with basic data
            this.id = testDoc.id;
            this.user_id = testDoc.user_id;
            this.name = testDoc.name;
            this.is_public = testDoc.is_public ?? false; // Default to false if missing
            this.gpt_provider = testDoc.gpt_provider;
            this.gpt_model = testDoc.gpt_model;
            this.grade_rules = testDoc.grade_rules || "";
            // Only load test_data_result if it exists, avoid overwriting if null
            if (testDoc.test_data_result !== undefined) {
                this.test_data_result = testDoc.test_data_result;
            }

            // 3. Load Test-Level Files (Instantiate TestFile with Firestore data)
            this.files = {
                test: new TestFile(testDoc.files?.test || {}),
                rubric: new TestFile(testDoc.files?.rubric || {}),
                students: new TestFile(testDoc.files?.students || {}),
            };
            // Ensure TestFile instances get the id if available from Firestore data
            if (testDoc.files?.test?.id) this.files.test._id = testDoc.files.test.id;
            if (testDoc.files?.rubric?.id) this.files.rubric._id = testDoc.files.rubric.id;
            if (testDoc.files?.students?.id) this.files.students._id = testDoc.files.students.id;


            // 4. Fetch child collections concurrently
            console.log("Test: Fetching child collections...");
            const [
                questionsSnapshot,
                targetsSnapshot,
                studentsSnapshot,
                gptTestSettingsSnapshot,
                gptQuestionSettingsSnapshot,
                testPdfSettingsSnapshot,
            ] = await Promise.all([
                getDocs(query(collection(db, 'questions'), where("test_id", "==", testId))),
                getDocs(query(collection(db, 'targets'), where("test_id", "==", testId))),
                getDocs(query(collection(db, 'students'), where("test_id", "==", testId))),
                getDocs(query(collection(db, 'gpt_tests_settings'), where("test_id", "==", testId))),
                getDocs(query(collection(db, 'gpt_questions_settings'), where("test_id", "==", testId))),
                getDocs(query(collection(db, 'test_pdf_settings'), where("test_id", "==", testId))),
            ]);
            console.log("Test: Child collections fetched.");

            // 5. Process Targets first (needed for Questions/RubricPoints)
            this.targets = targetsSnapshot.docs.map(doc => new Target({
                test: this,
                ...doc.data(),
                id: doc.id
            }));
            console.log(`Test: Loaded ${this.targets.length} targets.`);

            // 6. Process Questions and their Rubric Points
            this.questions = []; // Clear existing before loading
            for (const qDoc of questionsSnapshot.docs) {
                const question = new Question({
                    test: this,
                    ...qDoc.data(),
                    id: qDoc.id
                });

                // Fetch and assign Rubric Points for this question
                const pointsQuery = query(collection(db, 'rubric_points'), where("question_id", "==", question.id));
                const pointsSnapshot = await getDocs(pointsQuery);
                question.points = pointsSnapshot.docs.map(pDoc => {
                    const pointData = pDoc.data();
                    // Find the corresponding Target instance using the target_id
                    const target = this.targets.find(t => t.id === pointData.target_id);
                    if (!target) {
                        console.warn(`RubricPoint ${pDoc.id} for Question ${question.id} has missing or invalid target_id: ${pointData.target_id}`);
                    }
                    return new RubricPoint({
                        question: question,
                        ...pointData,
                        id: pDoc.id,
                        target: target || new Target({}) // Assign found target or a default empty one
                    });
                }).sort((a, b) => a.point_index - b.point_index); // Ensure points are ordered
                this.questions.push(question);
            }
            this.questions.sort((a, b) => {
                // Handle potential non-numeric parts in question_number (e.g., '1a', '1b')
                const numA = parseFloat(a.question_number);
                const numB = parseFloat(b.question_number);
                if (numA !== numB) {
                    return numA - numB;
                }
                // If numbers are equal, compare alphabetically
                return a.question_number.localeCompare(b.question_number);
            });
            console.log(`Test: Loaded ${this.questions.length} questions with their rubric points.`);


            // 7. Process Students and their Results (including Scan Images)
            this.students = []; // Clear existing before loading
            const studentPromises = studentsSnapshot.docs.map(async (sDoc) => {
                const student = new Student({
                    test: this,
                    ...sDoc.data(),
                    id: sDoc.id
                });

                // Fetch Results for this student
                const resultsQuery = query(collection(db, 'students_question_results'), where("student_id", "==", student.id));
                const resultsSnapshot = await getDocs(resultsQuery);

                student.results = await Promise.all(resultsSnapshot.docs.map(async (rDoc) => {
                    const resultData = rDoc.data();
                    const questionResult = new StudentQuestionResult({
                        student: student,
                        ...resultData,
                        id: rDoc.id,
                        // Initialize scan object - URL will be added below
                        scan: new ScanQuestion({}), // Provide minimal initial ScanQuestion
                        scan_base64: null // Explicitly set base64 to null initially
                    });

                    // --- Load Student Answer Scan Image URL ---
                    const storagePath = `tests/${testId}/student_answers/${rDoc.id}/answer.png`;
                    try {
                        const storageRef = ref(storage, storagePath);
                        const downloadURL = await getDownloadURL(storageRef);
                        questionResult.scan_base64 = downloadURL; // Store URL in scan_base64 (or create scan_url)
                        // Optionally update the nested scan object if needed elsewhere, though scan_base64 is now the primary
                        questionResult.scan.file = new TestFile({
                            url: downloadURL,
                            storage_path: storagePath
                        }); // Assuming TestFile can handle this
                        console.log(`Test: Loaded scan image URL for result ${rDoc.id}: ${downloadURL}`);
                    } catch (error) {
                        if (error.code === 'storage/object-not-found') {
                            console.warn(`Test: Scan image not found in Storage for result ${rDoc.id} at path ${storagePath}`);
                        } else {
                            console.error(`Test: Error getting download URL for result ${rDoc.id}:`, error);
                        }
                        questionResult.scan_base64 = null; // Ensure it's null if loading failed
                    }
                    // --- End Load Scan Image URL ---

                    // Fetch and assign Point Results
                    const pointResultsQuery = query(collection(db, 'students_points_results'), where("student_question_result_id", "==", rDoc.id));
                    const pointResultsSnapshot = await getDocs(pointResultsQuery);
                    questionResult.point_results = {}; // Initialize as object
                    pointResultsSnapshot.forEach(prDoc => {
                        const pointResultData = prDoc.data();
                        questionResult.point_results[pointResultData.point_index] = new StudentPointResult({
                            student_result: questionResult,
                            ...pointResultData,
                            id: prDoc.id,
                        });
                    });

                    // Fetch and assign Grade Instance
                    const gradeQuery = query(collection(db, 'grade_instances'), where("student_question_result_id", "==", rDoc.id));
                    const gradeSnapshot = await getDocs(gradeQuery);
                    if (gradeSnapshot.docs.length > 0) {
                        questionResult.grade_instance = new GradeInstance({
                            student_question_result: questionResult, // Link back if needed by GradeInstance
                            ...gradeSnapshot.docs[0].data(),
                            id: gradeSnapshot.docs[0].id,
                        });
                    } else {
                        questionResult.grade_instance = null; // Explicitly set to null if not found
                    }

                    return questionResult;
                })); // End map results

                // Sort results by question number after loading
                student.results.sort((a, b) => {
                    const qA = this.questions.find(q => q.id === a.question_id);
                    const qB = this.questions.find(q => q.id === b.question_id);
                    if (!qA || !qB) return 0; // Should not happen if data is consistent

                    const numA = parseFloat(qA.question_number);
                    const numB = parseFloat(qB.question_number);
                    if (numA !== numB) {
                        return numA - numB;
                    }
                    return qA.question_number.localeCompare(qB.question_number);
                });


                return student;
            }); // End map students

            this.students = await Promise.all(studentPromises);
            this.students.sort((a, b) => {
                // Sort by student_id numerically if possible, otherwise alphabetically
                const idA = Number(a.student_id);
                const idB = Number(b.student_id);
                if (!isNaN(idA) && !isNaN(idB)) {
                    return idA - idB;
                }
                return (a.student_id || "").localeCompare(b.student_id || "");
            });
            console.log(`Test: Loaded ${this.students.length} students with their results, points, grades and scan URLs.`);


            // 8. Load Settings Objects
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
            });
            if (!this.test_settings.name && this.name) {
                this.test_settings.name = this.name; // Fallback pdf name to test name
            }
            console.log("Test: Loaded GPT and PDF settings.");

            // 9. Load Pages and Sections (NOT IMPLEMENTED as per current save logic)
            // The current save structure doesn't store page/section metadata in Firestore.
            // If you need to load page/section *images* or *metadata*, the save logic
            // (savePagesAndSections) needs to be updated to store relevant info in Firestore.
            // For now, student answer images are loaded directly via StudentQuestionResult.
            this.pages = []; // Keep pages empty as they are not loaded from Firestore
            console.warn("Test: Loading Pages and Sections from Firestore is not implemented due to current save logic.");


            console.log(`Test: Successfully loaded all data for Test ID: ${testId}`);
            this.loading.save_to_database = false;
            return this; // Return the populated Test instance

        } catch (error) {
            console.error(`Test: Error loading test ${testId} from Firestore:`, error);
            this.loading.save_to_database = false;
            return null; // Indicate failure
        }
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
        this.scan = new ScanQuestion({ //REMOVED File instance
            ...scan,
        })
        this.scan_base64 = scan_base64 || null //NEW, store base64 directly
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
