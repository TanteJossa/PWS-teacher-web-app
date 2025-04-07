import {
    db,
    storage,
    auth,
} from './firebase.js'; // Import Firebase instances

import {
    ref,
    uploadBytes,
    getDownloadURL,
    deleteObject,
    getStorage,

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
    and,
    writeBatch,
    FieldPath,
    documentId
} from "firebase/firestore";
import {
    getRandomID,
    fetchFileAsBlob,
    sum,
    apiRequest,
    chunkArray,
    downloadResultPdf,
    downloadTest,
    MAX_IMAGE_SIZE_BYTES,
    TARGET_COMPRESSION_FORMAT,
    base64ToArrayBuffer,
    compressImageToPngBase64,
    rotateImage180
} from '@/helpers'
import {
    globals
} from '@/main.js'
import {
    useUserStore
} from '@/stores/user_store'



class FirestoreBase {
    constructor(collectionName) {
        this.collectionName = collectionName;
    }
    get dbCollection() {
        return collection(db, this.collectionName)
    }
    async getById(id, collection_name = null) {
        if (!id) return null;
        try {
            var docRef = doc(collection(db, collection_name || this.collectionName), id);

        } catch (error) {
            return null
        }
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return {
                id: docSnap.id,
                ...docSnap.data()
            };
        } else {
            return null;
        }
    }


    saveToFirestoreBatch(batch = null, id = null, data = null) {
        if (!batch) {
            console.error(`RubricPoint ${this.id}: No batch provided.`);
            return;
        }
        const to_upload_data = JSON.parse(JSON.stringify(data || this.data || {}));

        batch.set(doc(db, this.collectionName, id || this.id), to_upload_data, {
            merge: true
        })
    }

    /**
     * Deletes the document with the given ID from Firestore.
     * Does NOT handle child documents or storage files.
     * @param {string} id - The ID of the document to delete.
     */
    async delete(id) {
        if (!id) {
            console.error(`${this.constructor.name}: Delete requires a document ID.`);
            throw new Error("Delete requires a document ID.");
        }
        try {
            const docRef = doc(this.dbCollection, id);
            await deleteDoc(docRef);
            console.log(`${this.constructor.name}: Document ${id} deleted successfully.`);
            return true; // Indicate success
        } catch (e) {
            console.error(`${this.constructor.name}: Error deleting document ${id}: `, e);
            throw e; // Re-throw for caller handling
        }
    }
    async getContentById(ids, collection_name, other_filters=[]) {
        // don't run if there aren't any ids or a path for the collection
        if (!ids || !ids.length || !collection_name) return [];

        const collectionPath = collection(db, collection_name);
        const batches = [];

        while (ids.length && ids.length > 0 ) {
            // firestore limits batches to 10
            const batch = ids.splice(0, 29);

            // add the batch request to to a queue
            batches.push(
                getDocs(query(
                    collectionPath,
                    and(
                        where(
                            'id',
                            'in',
                            [...batch]
                        ),
                        ...other_filters
                    )
                ))
                .then(results => results.docs.map(result => ({
                    /* id: result.id, */ ...result.data()
                })))
            )
        }

        // after all of the data is fetched, return it
        return Promise.all(batches)
            .then(content => content.flat()) || [];
    }

}



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
    get data() {
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



class File extends FirestoreBase {
    constructor({
        test = null,
        name = null,
        id = getRandomID(),
        file_type = null,
        bucket_url = null,
        raw = null,
        path = {},
        test_id = null,
        user_id = null,
        section_id = null,
        scan_question_id = null,
        extra_data = null,
        original_raw = null,
    }) {
        super('files');
        this.test = test
        this.name = name
        this.id = id
        this.file_type = file_type
        this.bucket_url = bucket_url
        this.raw = raw
        this.path = path
        this.test_id = test_id
        this.user_id = user_id
        this.section_id = section_id
        this.scan_question_id = scan_question_id
        this.extra_data = extra_data
        this.original_raw = original_raw
    }
    get url() {
        return this.raw || (this.bucket_url ? this.bucket_url : null);
    }
    set url(value) {
        this.bucket_url = value;
    }
    get bucket_route() {

        const testId = this.test?.id || this.test_id;
        if (!testId) {
            console.warn("File: Cannot determine bucket route without test ID for file:", this.id);
            return `files/orphaned/${this.id}/${this.name || 'file'}${this.file_type ? '.' + this.file_type : ''}`; // Fallback path
        }
        var route = `tests/${testId}/`
        Object.keys(this.path).forEach(key => {
            const value = this.path[key]
            if (value) {
                const segment = String(value).replace(/[^a-zA-Z0-9_-]/g, '_'); // Basic sanitization
                route += `${key}/${segment}/`

            } else {
                route += `${key}/`

            }

        })
        const fileName = (this.name || `file_${this.id}`).replace(/[^a-zA-Z0-9_.-]/g, '_');
        route += fileName
        console.log(route)
        if (this.file_type && !fileName.endsWith(`.${this.file_type}`)) {
            route += `.${this.file_type}`;
        }

        return route
    }
    get data() {
        return {
            name: this.name,
            id: this.id,
            file_type: this.file_type,
            bucket_url: this.bucket_url,
            // raw: this.raw,
            path: this.path,
            test_id: this.test?.id || this.test_id,
            user_id: this.user_id,
            section_id: this.section_id,
            scan_question_id: this.scan_question_id,
            // extra_data: this.extra_data,

        }
    }


    async uploadAndSaveToFirestoreBatch(batch) {
        if (!batch || !this.raw) {
            console.log('Missing batch or raw data for file upload:', this);
            return;
        }

        const user_store = useUserStore();
        if (!user_store.user) {
            console.log('No user found for file upload:', this);
            return;
        }
        this.user_id = user_store.user.uid;

        const storageRef = ref(storage, this.bucket_route);

        let sourceData = this.raw;
        let sourceMimeType = 'application/octet-stream'; // Default
        let isImage = false;
        let needsInitialConversion = false; // Does original Base64 need conversion if NOT compressed?

        // 1. Determine Type and if it's an image
        if (typeof sourceData === 'string' && sourceData.startsWith('data:')) {
            sourceMimeType = sourceData.substring(sourceData.indexOf(':') + 1, sourceData.indexOf(';'));
            isImage = sourceMimeType.startsWith('image/');
            needsInitialConversion = true; // Will need ArrayBuffer conversion if not compressed
        } else if (sourceData instanceof Blob) {
            sourceMimeType = sourceData.type || sourceMimeType;
            isImage = sourceMimeType.startsWith('image/');
        } else if (sourceData instanceof ArrayBuffer) {
            // Infer type (basic) - could be improved
            if (this.file_type === 'png') sourceMimeType = 'image/png';
            else if (['jpeg', 'jpg'].includes(this.file_type)) sourceMimeType = 'image/jpeg';
            else if (this.file_type === 'pdf') sourceMimeType = 'application/pdf';
            // Add more types as needed
            isImage = sourceMimeType.startsWith('image/');
        } else {
            console.error(`File: Unsupported raw data type for ${this.id}:`, typeof sourceData);
            return;
        }

        let uploadData = sourceData; // This will hold the data to be uploaded (original or compressed)
        let finalMimeType = sourceMimeType; // MimeType for upload metadata

        // 2. Compress Image if Necessary
        if (isImage) {
            let initialSize = 0;
            if (sourceData instanceof Blob) initialSize = sourceData.size;
            else if (sourceData instanceof ArrayBuffer) initialSize = sourceData.byteLength;
            else if (needsInitialConversion) initialSize = sourceData.length * 0.75; // Estimate base64 size

            console.log(`File: Image ${this.id} detected. Type: ${sourceMimeType}, Estimated Size: ${initialSize.toFixed(0)} bytes`);

            if (initialSize > MAX_IMAGE_SIZE_BYTES) {
                console.log(`File: Image ${this.id} exceeds size limit. Attempting compression to PNG Base64...`);
                try {
                    const compressedPngBase64 = await compressImageToPngBase64(sourceData, sourceMimeType);
                    uploadData = compressedPngBase64; // Use the new Base64 string
                    finalMimeType = TARGET_COMPRESSION_FORMAT; // Set type to PNG
                    console.log(`File: Compression successful for ${this.id}. Uploading as PNG Base64.`);
                    // Mark that it no longer needs initial conversion, as it's now the target format
                    needsInitialConversion = false;
                } catch (error) {
                    console.error(`File: Compression failed for ${this.id}: ${error}. Trying to upload original.`);
                    // Keep original uploadData, sourceMimeType, needsInitialConversion
                }
            } else {
                console.log(`File: Image ${this.id} is within size limits. No compression needed.`);
            }
        }
        console.log(this)

        // 3. Prepare Final Upload Data (Ensure ArrayBuffer or Blob)
        let finalUploadBuffer = null;
        if (typeof uploadData === 'string' 
            && uploadData.startsWith('data:')
        ) {
            // This happens if compression occurred OR if original was base64 and wasn't compressed
            finalUploadBuffer = base64ToArrayBuffer(uploadData);
            if (!finalUploadBuffer) {
                console.error(`File: Failed to convert final Base64 data to ArrayBuffer for ${this.id}. Aborting upload.`);
                return;
            }
            // If original was base64 and we ended up here (no compression), finalMimeType is already correct (sourceMimeType).
            // If compression happened, finalMimeType was set to 'image/png'.
        } else if (uploadData instanceof Blob) {
            // Read Blob into ArrayBuffer for consistency (uploadBytes handles both, but this avoids branching)
            // Alternatively, just pass the Blob directly: finalUploadBuffer = uploadData;
            try {
                finalUploadBuffer = await uploadData.arrayBuffer();
            } catch (e) {
                console.error(`File: Failed to read Blob data for ${this.id}:`, e);
                return;
            }

        } else if (uploadData instanceof ArrayBuffer) {
            finalUploadBuffer = uploadData; // Already in correct format
        }

        if (!finalUploadBuffer) {
            console.error(`File: No valid data buffer to upload for ${this.id}.`);
            return;
        }

        // 4. Upload to Storage
        try {
            const metadata = {
                contentType: finalMimeType
            };
            console.log(`File: Uploading data for ${this.id}. Final type: ${finalMimeType}, Size: ${finalUploadBuffer.byteLength} bytes.`);

            await uploadBytes(storageRef, finalUploadBuffer, metadata);
            const downloadURL = await getDownloadURL(storageRef);
            this.bucket_url = downloadURL;
            console.log(`File: Upload successful for ${this.id}. URL: ${this.bucket_url}`);
            this.raw = null; // Clear raw data on success

            // 5. Add to Firestore Batch (only on successful upload)
            this.saveToFirestoreBatch(batch);

        } catch (error) {
            console.error(`File: Error uploading file ${this.id} to ${this.bucket_route}:`, error);
            this.bucket_url = null; // Ensure URL is null on error
            // Do not add to batch if upload failed
        }
    }
    async base64() {
        // --- Input Validation and Type Checking ---

        const inputSource = this.url

        if (!inputSource) {
            console.warn("Input source is null or empty.");
            return null;
        }

        // 1. Check if the input is already a Base64 Data URI string
        if (typeof inputSource === 'string' && inputSource.trim().startsWith('data:')) {
            // It's already in the desired format, return it directly.
            // Optional: Add validation here if needed to ensure it's a *valid* data URI.
            return inputSource;
        }

        // --- Define Blob to Base64 Conversion Logic (Reusable) ---
        const convertBlobToBase64 = (blob, sourceDescription) => {
            return new Promise((resolve) => { // Changed reject to resolve(null) for consistency
                // Double-check if it's a valid Blob
                if (!(blob instanceof Blob)) {
                    console.error(`Invalid input: Expected a Blob object for ${sourceDescription}. Got:`, blob);
                    resolve(null);
                    return;
                }

                // Optional: Check for empty blob
                if (blob.size === 0) {
                    console.warn(`Input Blob for ${sourceDescription} has size 0.`);
                    // FileReader will likely produce "data:mime/type;base64," which might be desired.
                }

                const reader = new FileReader();
                reader.onloadend = () => {
                    // reader.result contains the Data URI: "data:mime/type;base64,BASE64_DATA"
                    if (typeof reader.result === 'string') {
                        // Removed this.raw assignment as it might not be applicable outside a class context
                        // If this function IS part of a class and you need it, add it back:
                        // this.raw = reader.result;
                        this.original_raw = reader.result
                        resolve(reader.result);
                    } else {
                        console.error(`FileReader failed to produce a string result for blob from ${sourceDescription}`);
                        resolve(null);
                    }
                };
                reader.onerror = (error) => {
                    console.error(`Error converting Blob to Base64 for ${sourceDescription}:`, error);
                    resolve(null);
                };

                reader.readAsDataURL(blob); // Reads the blob and encodes it into a Data URI
            });
        };

        // --- Handle Different Input Types ---

        // 2. Check if the input is a File or Blob object
        if (inputSource instanceof Blob) { // File inherits from Blob, so this catches both
            const description = inputSource instanceof File ? `File: ${inputSource.name}` : 'Blob input';
            return convertBlobToBase64(inputSource, description);
        }

        // 3. Assume it's a URL string - Fetch the content as a Blob
        if (typeof inputSource === 'string') {
            let blob;
            let fileUrl = inputSource; // Use the input string directly as the URL

            try {
                // Fetch using XHR Promise structure
                blob = await new Promise((resolve) => { // Changed reject to resolve(null)
                    const xhr = new XMLHttpRequest();
                    xhr.open('GET', fileUrl);
                    xhr.responseType = 'blob'; // Expect a Blob response

                    xhr.onload = function () {
                        // Use status 0 for successful file:// URLs as well
                        if (xhr.status === 200 || (xhr.responseURL?.startsWith('file:') && xhr.status === 0)) {
                            if (xhr.response && xhr.response instanceof Blob) {
                                resolve(xhr.response); // Resolve with the Blob object
                            } else {
                                console.error(`Failed to load file: Response was not a valid Blob for ${fileUrl}`);
                                resolve(null);
                            }
                        } else {
                            console.error(`Failed to load file: ${xhr.status} - ${xhr.statusText} for ${fileUrl}`);
                            resolve(null);
                        }
                    };

                    xhr.onerror = function () {
                        // Handle network errors, CORS issues, etc.
                        console.error(`Network error or CORS issue occurred while fetching file: ${fileUrl}`);
                        resolve(null);
                    };

                    xhr.send();
                });

                // If fetching failed (returned null), blob will be null
                if (!blob) {
                    return null; // Exit early if blob fetching failed
                }

                // 4. Convert the fetched Blob to Base64 Data URI
                return convertBlobToBase64(blob, `URL: ${fileUrl}`);

            } catch (error) {
                // Catch errors from URL construction or the XHR Promise itself (less likely with resolve(null))
                console.error(`Error fetching or processing URL "${fileUrl}":`, error);
                return null;
            }
        }

        // --- Handle Invalid Input Type ---
        console.error("Invalid input type provided. Expected URL string, Data URI string, File, or Blob. Got:", typeof inputSource, inputSource);
        return null;
    }




}

class Question extends FirestoreBase {
    constructor({
        test = null,
        id = getRandomID(),
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
        this.answer_text = answer_text
        this.points = []

        points.forEach(e => this.addRubricPoint(e))
    }
    get total_points() {
        return this.points.reduce((sum, point) => sum + (Number(point.point_weight) || 0), 0);
    }
    get data() {
        return {
            test_id: this.test?.id || this.test_id,
            id: this.id,
            is_draw_question: this.is_draw_question,
            question_number: this.question_number,
            question_context: this.question_context,
            question_text: this.question_text,
            answer_text: this.answer_text,
            points: this.points.map( e => e.data)
            // points_ids: this.points.map(e => e.id)
        }
    }
    addRubricPoint(point) {
        if (!this.test) {
            console.warn(`Question ${this.id}: Cannot add RubricPoint without a valid parent Test object.`);
            return;
        }

        const target = this.test.targets?.findIndex(e => e.target_name == point.target_name)

        if (!target && (point.target_name || point.target_id)) {
            console.warn(`Question ${this.id}: Target '${point.target_name || point.target_id}' not found in parent Test for RubricPoint.`);
        }

        this.points.push(new RubricPoint({
            ...point,
            question: this,
        }))
    }
    async saveToFirestoreBatch(batch) {
        // Promise.all(this.points.map(point => point.saveToFirestoreBatch(batch)))

        super.saveToFirestoreBatch(batch)

    }

}

class RubricPoint extends FirestoreBase {
    constructor({
        question = new Question({}),
        id = getRandomID(),
        point_text = "",
        point_name = "",
        point_weight = 1,
        point_index = 0,
        target = null,
        target_id = null,
        test_id = null,
    }) {
        super('rubric_points');
        this.question = question

        this.id = id
        this.point_index = point_index
        this.point_text = point_text
        this.point_name = point_name
        this.point_weight = point_weight
        this.target_id = target?.id || target_id
        if (!this.target_id){
            this.target_id = this.question.test?.targets?.find(e => e.id == this.target_id)
        }
        this.test_id = question?.test?.id || test_id
    }
    get target() {
        return this.question.test.targets.find(e => e.id == this.target_id)
    }
    get data() {
        return {
            question_id: this.question?.id,
            test_id: this.question?.test?.id || this.test_id,
            id: this.id,
            point_index: this.point_index,
            point_text: this.point_text,
            point_name: this.point_name,
            point_weight: this.point_weight,
            target_id: this.target_id,
        }
    }
    async saveToFirestoreBatch(batch) {

        if (!this.question) {
            console.error(`RubricPoint ${this.id}: Cannot save without question.`);
            return;
        }
        super.saveToFirestoreBatch(batch)

    }
}

class Target extends FirestoreBase {
    constructor({
        test = null,
        id = getRandomID(),
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
    get data() {
        return {
            test_id: this.test.id,
            id: this.id,
            target_name: this.target_name,
            explanation: this.explanation,
        }
    }
    saveToFirestoreBatch(batch) {
        super.saveToFirestoreBatch(batch)
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
    get data() {
        return {
            test_id: this.test.id,
            id: this.id,
            rtti: this.rtti,
            subject: this.subject,
            targets: this.targets,
            point_count: this.point_count,
        }
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
    get data() {
        return {
            test_id: this.test?.id,
            id: this.id,
            school_type: this.school_type,
            school_year: this.school_year,
            school_subject: this.school_subject,
            subject: this.subject,
            learned: this.learned,
            requested_topics: this.requested_topics,
        }
    }
}

class TestPdfSettings {
    constructor({
        test = null,
        id = getRandomID(),
        name = "",
        show_targets = true,
        show_answers = false,
        output_type = 'docx'
    }) {
        this.test = test
        this.id = id
        this.name = name
        this.show_targets = show_targets
        this.show_answers = show_answers
        this.output_type = output_type
    }
    get data() {
        return {
            test_id: this.test.id,
            id: this.id,
            name: this.name,
            show_targets: this.show_targets,
            show_answers: this.show_answers,
            output_type: this.output_type,
        }
    }
}

class Test extends FirestoreBase {
    constructor({
        id = getRandomID(),
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
        this.files = files
        this.updateFiles()
        this.pages = pages.map(e => new ScanPage({
            ...e,
            test: this
        }))


        this.targets = targets.map(e => new Target({
            ...e,
            test: this,
        }))
        this.questions = questions.map(e => new Question({
            ...e,
            test: this,
        }))
        this.setQuestionNumbers();
        this.students = students.map(e => new Student({
            ...e,
            test: this,
        }))
        this.test_data_result = test_data_result
        this.gpt_test = new GptTestSettings({
            ...gpt_test,
            test: this
        })
        this.gpt_question = new GptQuestionSettings({
            ...gpt_question,
            test: this
        })
        this.test_settings = new TestPdfSettings({
            ...test_settings,
            test: this
        })

        this.loading = {
            pdf_data: false,
            structure: false,
            sections: false,
            students: false,
            grading: false,
            test_pdf: false,
            save_to_database: false,
            cleanup: false,
        }

        this.gpt_provider = gpt_provider
        this.gpt_model = gpt_model
        this.grade_rules = grade_rules

        this.is_public = is_public
    }
    get modelConfig() {
        return {
            google: {
                "gemini-2.5-pro-exp-03-25": {
                    test_recognition: "nieuw, zeer langzaam en werkt soms",
                    test_generation: "nieuw, zeer langzaam en werkt soms",
                    text_recognition: "nieuw, zeer langzaam en werkt soms",
                    grading: "nieuw, zeer langzaam en werkt soms",
                },
                "gemini-2.0-flash-thinking-exp-01-21": {
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
                // "gemini-exp-1206": {
                //     test_recognition: "pro 2.0, werkt meestal",
                //     test_generation: "pro 2.0, werkt meestal",
                //     text_recognition: "pro 2.0, werkt meestal",
                //     grading: "pro 2.0, werkt meestal",
                // },
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
            groq: {
                // "qwen-qwq-32b": {
                //     test_recognition: "Groq is snelle versie van open-source modellen",
                //     test_generation: "Groq is snelle versie van open-source modellen",
                //     text_recognition: "Groq is snelle versie van open-source modellen",
                //     grading: "Groq is snelle versie van open-source modellen",
                // },
                "deepseek-r1-distill-llama-70b": {
                    test_recognition: "Groq is snelle versie van open-source modellen",
                    test_generation: "Groq is snelle versie van open-source modellen",
                    text_recognition: "Groq is snelle versie van open-source modellen",
                    grading: "Groq is snelle versie van open-source modellen",
                },
                // "qwen-qwq-32b": {
                //     test_recognition: "Groq is snelle versie van open-source modellen",
                //     test_generation: "Groq is snelle versie van open-source modellen",
                //     text_recognition: "Groq is snelle versie van open-source modellen",
                //     grading: "Groq is snelle versie van open-source modellen",
                // },
            },
            // deepseek: {
            //     "deepseek-chat": {
            //         test_recognition: "oude deepseek model, kan lever rare resultaten op",
            //         test_generation: "oude deepseek model, kan lever rare resultaten op",
            //         text_recognition: "oude deepseek model, kan lever rare resultaten op",
            //         grading: "oude deepseek model, kan lever rare resultaten op",
            //     },
            //     "deepseek-reasoner": {
            //         test_recognition: "r1",
            //         test_generation: "r1",
            //         text_recognition: "r1",
            //         grading: "r1",
            //     }
            // },
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
    get provider_models() {
        return Object.keys(this.modelConfig).reduce((data, model) => {
            data[model] = Object.keys(this.modelConfig[model])
            return data
        }, {})
    }
    get total_model_count() {
        return sum(Object.values(this.provider_models).map(e => e.length))
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
    get data() {
        const user_store = useUserStore()

        const test_data = {
            id: this.id,
            file_ids: Object.keys(this.files).reduce((data, e) => {
                data[e] = this.files[e].id;
                return data
            }, {}),
            question_ids: this.questions?.map(e => e.id),
            student_ids: this.students?.map(e => e.id),
            target_ids: this.targets?.map(e => e.id),
            page_ids: this.pages?.map(e => e.id),

            test_data_result: this.test_data_result,
            gpt_test: this.gpt_test.data,
            gpt_question: this.gpt_question.data,
            test_settings: this.test_settings.data,
            gpt_provider: this.gpt_provider,
            gpt_model: this.gpt_model,
            grade_rules: this.grade_rules,
            name: this.name,
            is_public: this.is_public,
            user_id: user_store.user.uid,
            updated_at: new Date().toISOString(),
            created_at: this.created_at || new Date().toISOString(),
        }

        return test_data



    }

    updateFiles(filesData = {}) {
        const fileTypes = ['test', 'rubric', 'students']

        fileTypes.forEach(type => {
            this.files[type] = new File({
                ...(filesData[type] || this.files[type] || {}),
                test: this,
                file_type: 'pdf',
                name: type,
                path: {
                    pdfs: type
                }
            });
        });
    }
    setQuestionNumbers() {
        this.questions.forEach((question, index) => {
            question.question_number = (index + 1).toString()
        })
    }
    addTarget(target) {


        this.targets.push(new Target({
            ...target,
            test: this,
        }))
    }
    addQuestion(question) {
        if (question.question_number || this.questions.length) {

            this.questions.push(new Question({
                ...question,
                question_number: question.question_number || (this.questions.length ).toString(),
                test: this,
            }))
        } else {
            console.log('Could not find question id for: ', question)
        }
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


        const base64_sections = await Promise.all(this.pages.map(page => page.sections.map(async section => (await section.images.question_selector.base64()) || "")).flat(Infinity))

        const response = await apiRequest('/question_selector_info', {
            "base64Images": JSON.stringify(base64_sections),
            "checkbox_count": "7"
        })

        if (response?.length && response.length != base64_sections.length) {
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
                    continue
                }
                this.pages[index].sections[section_index].question_number = 0

            }
        }


    }
    async scanStudentIdsAndSections() {
        this.loading.sections = true
        // const preload = []
        // await Promise.all(this.pages.map(async (page, index) => {
        await Promise.all([
            this.loadStudentIds(),
            this.loadSections(),
        ])

        this.loading.sections = false

    }
    async downloadStudentResults(feedback_field = false) {
        await downloadResultPdf(this.student_pdf_data, feedback_field, 'AlleResultaten')
    }
    // GPT PREPARATION
    async uploadFile(file, fileType) {
        if (!file || !fileType) {
            console.error("Test: Missing file or fileType for upload");
            return false;
        }

        // console.log(`Test: Uploading ${fileType} file...`);
        this.files[fileType].raw = file;
        return

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
            const blob = await fetchFileAsBlob(this.files[fileType].url);

            if (["rubric", "test"].includes(fileType)) {
                this.files[fileType].extra_data = await globals.$extractTextAndImages(blob);
            } else if (fileType === "students") {
                const imageData = await globals.$pdfToBase64Images(blob);

                this.files[fileType].extra_data = imageData;

                if (imageData) {
                    imageData.forEach(image => {
                        this.addPage({
                            images: {
                                original: {
                                    raw: image,
                                    file_type: 'png'
                                }
                            },
                        });
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
    async loadStudents() {
        this.loading.students = true

        const unique_student_ids = [...new Set(this.pages.map(e => e.student_id))].filter(e => e).sort((a, b) => Number(a) - Number(b))
        console.log(unique_student_ids)

        const test_context = this.test_context

        await Promise.all(unique_student_ids.map(async student_id => {
        // for (var student_id in unique_student_ids) {
            var student_id = unique_student_ids[student_id]
            const student_pages = this.pages.filter(e => e.student_id == student_id)

            var student_sections = []

            student_pages.forEach(page => {
                student_sections = student_sections.concat(page.sections)
            });


            var scan_questions = await Promise.all(this.questions.sort((a, b) => Number(a?.question_number || Infinity) - Number(b?.question_number || Infinity)).map(async question => {
                const question_sections = student_sections.filter(section => section.question_number.toString() == question.question_number.toString())
                if (question_sections.length == 0) {
                    return {
                        success: false,
                        question_id: question.id
                    }

                }
                const sections = await Promise.all(question_sections.map(section => section.images.answer.base64()))

                const response = await apiRequest('/link_answer_sections', {
                    sections: sections,
                })

                if (!response || response.error) {
                    return {
                        success: false,
                        question_id: question.id
                    }
                }
                const scan_question = new ScanQuestion({
                    image: {
                        raw: response
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
                question_result.updatePoints()
                question_result.setScan()

                student.results.push(question_result)
            })
            console.log(student_id, student)

            const index = this.students.findIndex(e => e.student_id == student.student_id)
            if (index == -1) {
                this.students.push(student)

            } else {
                this.students[index] = student
            }
        // }
        }))
        try {
            
            this.students.sort((a, b) => Number(a.student_id) - Number(b.student_id))
        } catch (error) {
            console.log('something went wrong with sorting students')
        }

        // print preload
        console.log(this.students.map(student => {
            return {
                student_id: student.student_id,
                results: student.results.map(result => {
                    return {
                        question_number: result.question_number,
                        scan: {
                            url: result.scan.url,
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

    addPage(data) {
        this.pages.push(new ScanPage({
            ...data,
            test: this,
            context_data: this.test_context
        }))
    }
    async gradeStudents() {
        this.loading.grading = true
        await Promise.all(this.students.map(e => e.grade()))
        // for (let i = 0; i < this.students.length; i++) {
        //     await this.students[i].grade()

        // }
        this.loading.grading = false
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
    async loadTestStructure() {
        this.loading.structure = true
        const request_text = `
                Je krijg een toets en de antwoorden. Jouw taak is om die zo goed en precies mogelijk in een digitaal formaat om te zetten.
                je hoeft niets te doen met de context om een vraag. Het gaat alleen om de vraag zelf
                Extraheer uit de teksten de vragen:
                        vraag tekst: de exacte tekst van de vraag
                        question_context: tekst die voor een vraag staat, het is niet altijd nodig, dit is bijvoorbeeld een verhaaltje of de uitleg en informatie die voor de vraag staat, als hier een belangrijke foto staat, moet je die foto beschrijven. je hoeft niet 2x dezelfde tekst te kopieren bij tween vragen. 1 keer is voldoende
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

        const test_data = this.files.test.extra_data
        const rubric_data = this.files.rubric.extra_data


        var result = await apiRequest('/test-data', {
            requestText: request_text,
            testData: {
                toets: test_data,
                rubric: rubric_data
            },
            provider: this.gpt_provider,
            model: this.gpt_model
        })

        if (!result.result) {
            this.loading.structure = false

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
            settings: this.test_settings.data
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

    async saveToDatabase() {
        if (this.loading.save_to_database) {
            console.warn(`Test ${this.id}: Save operation already in progress.`);
            return;
        }

        this.loading.save_to_database = true

        const batch = writeBatch(db);

        console.log(this)
        const storage_writes = Promise.all([
            Object.values(this.files).map(e => e.uploadAndSaveToFirestoreBatch(batch)),
            this.pages.map(e => e.saveToFirestoreBatch(batch)),
            this.questions.map(e => e.saveToFirestoreBatch(batch)),
            this.targets.map(e => e.saveToFirestoreBatch(batch)),
            this.students.map(e => e.saveToFirestoreBatch(batch)),
            super.saveToFirestoreBatch(batch)
        ].flat(Infinity))
        try {
            await storage_writes

            await batch.commit(); // Commit the batch write

            await this.cleanup()
        } catch (e) {
            this.loading.save_to_database = false;
            console.error('Error during test upload: ', e)
        } finally {
            this.loading.save_to_database = false;
        }


    }

    async loadFromDatabase(testId) {
        if (!testId) {
            console.error("Test.loadFromDatabase: No testId provided.");
            // Cannot set ID on this instance if none provided
            return false; // Indicate failure
        }
        console.log(`Test.loadFromDatabase: Loading test with ID: ${testId}`);

        // If the instance calling this already has an ID, should we prevent loading a different one?
        // Or should we overwrite? Let's assume overwrite for now.
        // If this instance might be reused, consider resetting properties first.
        // e.g., this.resetState(); // You'd need to implement this method

        const testRef = doc(db, 'tests', testId);
        const testSnap = await getDoc(testRef);

        if (!testSnap.exists()) {
            console.warn(`Test.loadFromDatabase: Test document with ID ${testId} not found.`);
            return false; // Indicate failure: test not found
        }

        const testData = testSnap.data();
        console.log(`Test.loadFromDatabase: Found test data for ${testId}.`);

        // --- Populate 'this' instance with base data ---
        // Assign fetched data properties to the current instance
        Object.assign(this, new Test({
            ...testData
        })); // Overwrites existing properties with fetched ones
        this.id = testId; // Ensure the ID is set correctly

        // Reset arrays/objects that will be populated to avoid merging issues if called multiple times
        this.questions = [];
        this.targets = [];
        this.students = [];
        // this.files = {}; // Reset files
        this.pages = [];


        try {
            // --- Fetch related collections concurrently ---
            const [
                questionsSnap,
                targetsSnap,
                studentsSnap,
                // filesSnap,
                pagesSnap,
                // Add fetches for other direct children if necessary
            ] = await Promise.all([
                this.getContentById(testData.question_ids || [], 'questions'),
                this.getContentById(testData.target_ids || [], 'targets'),
                this.getContentById(testData.student_ids || [], 'students'),
                // getDocs(query(collection(db, 'files'), where('test_id', '==', testId))),
                this.getContentById(testData.page_ids || [], 'pages'),
                // ... more Promise.all entries
            ]);
            console.log(`Test.loadFromDatabase: Fetched related collections for ${this.id}.`);

            // --- Process related data ---

            // 1. Targets (Load first as Questions/Points might reference them)
            this.targets = targetsSnap.map(docSnap => new Target({
                ...docSnap,
                id: docSnap.id,
                test: this // Pass THIS instance
            }));
            console.log(`Test.loadFromDatabase: Loaded ${this.targets.length} targets.`);


            // 2. Questions & their Rubric Points
            const questionPromises = questionsSnap.map(async (docSnap) => {
                const questionData = docSnap;
                const questionId = docSnap.id;
                const question = new Question({
                    ...questionData,
                    id: questionId,
                    test: this // Pass THIS instance
                });
                console.log(questionData)

                if (questionData.points_ids?.length && questionData.points_ids?.length > 0) {
                

                    // Fetch Rubric Points for this question
                    const pointsSnap = await this.getContentById(questionData.points_ids || [], 'rubric_points')
                    question.points = pointsSnap.map(pointSnap => new RubricPoint({
                        id: pointSnap.id,
                        ...pointSnap,
                        question: question, // Pass question instance
                        test: this, // Pass THIS instance
                        // Try to link Target instance using THIS instance's targets
                        target: this.targets.find(t => t.id === pointSnap.target_id) || null
                    }));
                }
                return question;
            });
            this.questions = (await Promise.all(questionPromises)).sort((a, b) => a.question_number - b.question_number);
            console.log(`Test.loadFromDatabase: Loaded ${this.questions.length} questions with their points.`);
            this.setQuestionNumbers(); // Recalculate numbers after loading

            await Promise.all(Object.keys(this.files).map(async key => {
                if (testData?.file_ids[key]) {
                    const docRef = doc(db, 'files', testData.file_ids[key]);
                    const doc_data = await getDoc(docRef)
                    if (doc_data.exists()) {

                        this.files[key] = new File({
                            ...(doc_data.data() || {})
                        })
                    }


                }
            }))
            this.updateFiles()

            // Ensure standard keys exist, even if empty
            console.log(`Test.loadFromDatabase: Loaded ${Object.keys(this.files).length} primary pdf files.`);


            // 4. Pages & their Sections, Files, etc. (Complex nested loading)
            const pagePromises = pagesSnap.map(async (docSnap) => {
                const pageData = docSnap;
                const pageId = docSnap.id;
                const page = new ScanPage({
                    id: pageId,
                    ...pageData,
                    test: this, // Pass THIS instance
                    // Explicitly initialize/clear fields managed below
                    images: {},
                    sections: [],
                    questions: [], // ScanQuestions
                });
                await Promise.all(Object.keys(page.images).map(async key => {
                    if (pageData.image_ids[key]) {

                        const docRef = doc(db, 'files', pageData.image_ids[key]);
                        const doc_data = await getDoc(docRef)
                        if (doc_data.exists()) {
                            page.images[key] = new File({
                                ...doc_data.data()
                            })

                        }
                    }
                }))
                page.setImages(); // Ensure standard structure)

                // if (pageData.section_ids?.length && pageData.section_ids?.length > 0) {

                //     // Fetch Sections for this page
                //     const sectionsSnap = await this.getContentById(pageData.section_ids || [], 'sections')
                //     await Promise.all(sectionsSnap.map(async sectionSnap => {
                //         const section_data = sectionSnap
                //         const section = new ScanSection({
                //             ...section_data,
                //             id: sectionSnap.id,
                //             page: page, // Pass page instance
                //             test: this, // Pass THIS instance
                //         })
                //         if (section_data.image_ids) {
                //             await Promise.all(Object.keys(section.images).map(async key => {
                //                 if (section_data.image_ids[key]) {

                //                     const docRef = doc(db, 'files', section_data.image_ids[key]);
                //                     const doc_data = await getDoc(docRef)
                //                     if (doc_data.exists()) {

                //                         section.images[key] = new File({
                //                             ...doc_data.data()
                //                         })
                //                     }
                //                 }
                //             }))
                //             section.setImages(); // Ensure standard structure)
                //         }

                //         return section

                //     })).then(sections => {
                //         sections.sort((a, b) => a?.index - b?.index).forEach(section => {
                //             page.addSection(section)
                //         })
                //     })
                // }

                if (pageData.question_ids?.length > 0) {

                    // Fetch ScanQuestions for this page
                    
                    const scanQuestionsSnap = await this.getContentById(pageData.question_ids || [], 'scan_questions')
                    Promise.all(scanQuestionsSnap.map(async questionSnap => {
                        const question_data = questionSnap
                        const question = new ScanQuestion({
                            ...question_data,
                            id: questionSnap.id,
                            page: page, // Pass page instance
                            test: this, // Pass THIS instance
                        })

                        if (question_data.image_id) {
                            const scan_ref = doc('files', image_id)
                            const scan_data = await getDoc(scan_ref)
                            if (scan_data.exists()) {
                                question.setImage(scan_data.data())
                            }
                        }
                        return question
                    })).then(questions => {
                        questions.sort((a,b) => Number(a?.question_number|| Infinity) - Number(b?.question_number|| Infinity)).forEach(question => {
                            page.addQuestion(question)
                        })
                    })

                }
                // Potentially load Section images similarly if needed

                return page;
            });
            this.pages = await Promise.all(pagePromises);
            console.log(`Test.loadFromDatabase: Loaded ${this.pages.length} pages with their sections/scan_questions/images.`);


            // 5. Students & their Results (Very complex nested loading)
            const studentPromises = studentsSnap.map(async (docSnap) => {
                const studentData = docSnap;
                const studentId = docSnap.id;
                const student = new Student({
                    id: studentId,
                    ...studentData,
                    test: this, // Pass THIS instance
                    results: [], // Initialize/clear results
                });
                if (studentData.result_ids && studentData.result_ids.length > 0) {


                    // Fetch StudentQuestionResults for this student AND this test
                    
                    const resultsSnap = await this.getContentById(studentData.result_ids || [], 'students_question_results')

                    const resultPromises = resultsSnap.map(async (resultSnap) => {
                        const resultData = resultSnap;
                        const resultId = resultSnap.id;
                        const result = new StudentQuestionResult({
                            ...resultData,
                            id: resultId,
                            student: student, // Pass student instance
                            test: this, // Pass THIS instance
                            // point_results: {}, // Initialize/clear points
                            scan: null, // Initialize/clear scan
                        });

                        // Fetch ScanQuestion associated with this result (using scan_id)
                        if (resultData.scan_id) {
                            // Assuming ScanQuestion has getById

                            const scanData = await this.getById(resultData.scan_id, 'scan_questions'); // Adjust if static
                            if (scanData) {
                                result.scan = new ScanQuestion({
                                    ...scanData,
                                    id: resultData.scan_id,
                                    test: this, // Pass THIS instance
                                    // Link page using THIS instance's pages
                                    page: this.pages.find(p => p.id === scanData.page_id) || scanData.page_id,
                                    image: null // Initialize image, load below
                                });
                                // Load the ScanQuestion's image File if image_id exists
                                if (scanData.image_id) {
                                    const fileData = await FirestoreBase.prototype.getById(scanData.image_id, 'files'); // Adjust if static
                                    if (fileData) {
                                        result.scan.setImage(fileData)
                                    }

                                } else {
                                    console.warn(`Test.loadFromDatabase: ScanQuestion ${resultData.scan_id} image file with ID ${result.scan.image_id} not found.`);

                                }


                                if (resultData.point_result_ids && Object.keys(resultData.point_result_ids).length > 0) {
                                    result.point_results = {}

                                    // result.point_results = []
                                    // Fetch StudentPointResults for this question result
                                    const pointResultsSnap = await this.getContentById(Object.keys(resultData.point_result_ids) || [], 'students_points_results')
                                    // const pointResultsSnap = await getDocs(query(collection(db, 'students_points_results'), and(where('id', 'in', Object.keys(resultData.point_result_ids)), where('student_result_id', '==', resultId))));

                                    const new_points = {}

                                    // result.point_results = {}; // Already reset above
                                    pointResultsSnap.forEach(prSnap => {
                                        const prData = prSnap;
                                        const pr = new StudentPointResult({
                                            id: prSnap.id,
                                            ...prData,
                                            student_result: result, // Pass result instance
                                            point_id: resultData.point_result_ids[prSnap.id]
                                            // No need to pass test/student again if they can be derived from student_result
                                        });
                                        new_points[pr.point_index] = pr
                                    });
                                    result.point_results = new_points
                                    result.updatePoints(); // Ensure structure matches question points
                                    // console.log(result)
                                }
                            } else {
                                console.warn(`Test.loadFromDatabase: StudentQuestionResult ${resultId} scan_question with ID ${resultData.scan_id} not found.`);
                            }
                        }

                        return result;
                    });

                    student.results = (await Promise.all(resultPromises)).sort((a, b) => a.scan?.question_number - b.scan?.question_number);
                }

                // Potentially sort results by question number if needed
                // student.results.sort((a, b) => a.question?.number - b.question?.number); // Requires linking Question to Result
                student.setResults()
                return student;
            });
            this.students = (await Promise.all(studentPromises)).sort((a, b) => a.student_id - b.student_id);
            console.log(`Test.loadFromDatabase: Loaded ${this.students.length} students with their results.`);


            // --- Final Population ---
            // 'this' is now populated.
            console.log(`Test.loadFromDatabase: Successfully loaded data into test instance ${this.id}.`, this);
            return true; // Indicate success

        } catch (error) {
            console.error(`Test.loadFromDatabase: Error loading related data for test ${this.id}:`, error);
            // The instance 'this' might be partially populated.
            // Consider resetting state or leaving as is depending on desired error handling.
            return false; // Indicate failure
        }
    }
    /**
     * Helper function to perform Firestore 'in' queries in batches.
     * Firestore 'in' queries support up to 30 comparison values.
     * @param {CollectionReference} collectionRef - The Firestore collection reference.
     * @param {string} field - The field to query on (e.g., 'id' using documentId(), 'page_id').
     * @param {Array<string>} values - The array of values to query against.
     * @returns {Promise<Array<QueryDocumentSnapshot>>} A promise that resolves with an array of all matching document snapshots.
     */
    async queryInBatches(collectionRef, field, values) {
        if (!values || values.length === 0) {
            return [];
        }

        const chunks = chunkArray(values, 29); // Use helper to split into chunks of 30
        const results = [];

        for (const chunk of chunks) {
            if (chunk.length === 0) continue;
            // Use documentId() for querying by document ID
            const fieldPath = field === 'id' ? documentId() : field;
            const q = query(collectionRef, where(fieldPath, 'in', chunk));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => results.push(doc));
        }
        return results;
    }

    async cleanup() {
        if (!this.id) {
            console.error(`Test Cleanup: Cannot perform cleanup without a test ID.`);
            return;
        }
        if (this.loading.cleanup) {
            console.warn(`Test Cleanup (${this.id}): Cleanup operation already in progress.`);
            return;
        }

        console.log(`Test Cleanup (${this.id}): Starting cleanup process...`);
        this.loading.cleanup = true;

        const test_id = this.id;
        const batch = writeBatch(db);
        const storage_refs_to_delete = []; // Store Storage References { ref: StorageReference, fileId: string, bucketUrl: string }
        let orphaned_firestore_count = 0;

        try {
            // --- Step 1: Collect all *expected* document IDs from the current instance ---
            console.log(`Test Cleanup (${this.id}): Collecting expected document IDs from current Test instance...`);

            const expected_test_file_ids = new Set(Object.values(this.files).map(f => f?.id).filter(Boolean));
            const expected_question_ids = new Set(this.questions.map(q => q.id).filter(Boolean));
            const expected_rubric_point_ids = new Set(this.questions.flatMap(q => q.points.map(p => p.id)).filter(Boolean));
            const expected_target_ids = new Set(this.targets.map(t => t.id).filter(Boolean));
            const expected_page_ids = new Set(this.pages.map(p => p.id).filter(Boolean));
            const expected_page_image_ids = new Set(this.pages.flatMap(p => Object.values(p.images).map(img => img?.id)).filter(Boolean));
            const expected_section_ids = new Set(this.pages.flatMap(p => p.sections.map(s => s.id)).filter(Boolean));
            const expected_section_image_ids = new Set(this.pages.flatMap(p => p.sections.flatMap(s => Object.values(s.images || {}).map(img => img?.id))).filter(Boolean));
            const expected_scan_question_ids_instance = new Set([ // IDs from instance's pages and results
                ...this.pages.flatMap(p => p.questions.map(sq => sq.id)),
                ...this.students.flatMap(s => s.results.map(r => r.scan?.id))
            ].filter(Boolean));
            const expected_scan_question_image_ids_instance = new Set([ // Image IDs from instance's scan questions
                ...this.pages.flatMap(p => p.questions.map(sq => sq.image?.id)),
                ...this.students.flatMap(s => s.results.map(r => r.scan?.image?.id))
            ].filter(Boolean));
            const expected_student_ids = new Set(this.students.map(s => s.id).filter(Boolean));
            const expected_student_result_ids = new Set(this.students.flatMap(s => s.results.map(r => r.id)).filter(Boolean));
            const expected_student_point_result_ids = new Set(this.students.flatMap(s => s.results.flatMap(r => Object.values(r.point_results).map(pr => pr.id))).filter(Boolean));

            // Combine all expected file IDs into one set for easier lookup later
            const all_expected_file_ids = new Set([
                ...expected_test_file_ids,
                ...expected_page_image_ids,
                ...expected_section_image_ids,
                ...expected_scan_question_image_ids_instance
            ]);

            console.log(`Test Cleanup (${this.id}): Expected Files: ${all_expected_file_ids.size}, Questions: ${expected_question_ids.size}, RubricPoints: ${expected_rubric_point_ids.size}, Targets: ${expected_target_ids.size}, Pages: ${expected_page_ids.size}, Sections: ${expected_section_ids.size}, ScanQuestions: ${expected_scan_question_ids_instance.size}, Students: ${expected_student_ids.size}, StudentResults: ${expected_student_result_ids.size}, StudentPointResults: ${expected_student_point_result_ids.size}`);


            // --- Step 2: Fetch Actual Primary Documents from Firestore ---
            console.log(`Test Cleanup (${this.id}): Fetching actual primary documents linked to test ID ${test_id}...`);


            const questionsQuery = query(collection(db, 'questions'), where("test_id", "==", test_id));
            const targetsQuery = query(collection(db, 'targets'), where("test_id", "==", test_id));
            const pagesQuery = query(collection(db, 'pages'), where("test_id", "==", test_id));
            const studentsQuery = query(collection(db, 'students'), where("test_id", "==", test_id));
            const mainTestDocSnap = await getDoc(doc(db, 'tests', test_id)); // Also get main doc data for file refs

            const [questionsSnap, targetsSnap, pagesSnap, studentsSnap] = await Promise.all([
                getDocs(questionsQuery),
                getDocs(targetsQuery),
                getDocs(pagesQuery),
                getDocs(studentsQuery),
            ]);

            const actual_question_ids = new Set(questionsSnap.docs.map(d => d.id));
            const actual_target_ids = new Set(targetsSnap.docs.map(d => d.id));
            const actual_page_ids = new Set(pagesSnap.docs.map(d => d.id));
            const actual_student_ids = new Set(studentsSnap.docs.map(d => d.id));

            // Extract referenced IDs from primary docs
            const actual_page_image_ids_refs = new Set(pagesSnap.docs.flatMap(d => Object.values(d.data().image_ids || {})));
            const referenced_student_result_ids_from_students = studentsSnap.docs.flatMap(d => d.data().result_ids || []);

            console.log(`Test Cleanup (${this.id}): Found Actual - Questions: ${actual_question_ids.size}, Targets: ${actual_target_ids.size}, Pages: ${actual_page_ids.size}, Students: ${actual_student_ids.size}`);

            // --- Step 3: Fetch Actual Secondary Documents from Firestore (using IDs from Step 2) ---
            console.log(`Test Cleanup (${this.id}): Fetching actual secondary documents based on primary results...`);

            const rubricPointsRef = collection(db, 'rubric_points');
            const sectionsRef = collection(db, 'sections');
            const studentResultsRef = collection(db, 'students_question_results');
            const studentPointResultsRef = collection(db, 'students_points_results');
            const scanQuestionsRef = collection(db, 'scan_questions');

            // Perform 'in' queries, handling potential empty arrays
            const rubricPointsDocs = await this.queryInBatches(rubricPointsRef, 'question_id', Array.from(actual_question_ids));
            const sectionsDocs = await this.queryInBatches(sectionsRef, 'page_id', Array.from(actual_page_ids));
            // Query results by student_id AND test_id for safety
            const studentResultsDocs = actual_student_ids.size > 0 ?
                await this.queryInBatches(studentResultsRef, 'student_id', Array.from(actual_student_ids)) : []
            // Scan Questions linked via Pages
            const scanQuestionsFromPagesDocs = await this.queryInBatches(scanQuestionsRef, 'page_id', Array.from(actual_page_ids));

            // Extract IDs and further references
            const actual_rubric_point_ids = new Set(rubricPointsDocs.map(d => d.id));
            const actual_section_ids = new Set(sectionsDocs.map(d => d.id));
            const actual_section_image_ids_refs = new Set(sectionsDocs.flatMap(d => Object.values(d.data().image_ids || {})));
            const actual_student_result_ids = new Set(studentResultsDocs.map(d => d.id));
            const referenced_scan_ids_from_results = new Set(studentResultsDocs.map(d => d.data().scan_id).filter(Boolean));
            const referenced_point_result_ids_from_results = new Set(studentResultsDocs.flatMap(d => Object.keys(d.data().point_result_ids || {}))); // These are the *document* IDs

            // Fetch Student Point Results based on fetched Result IDs
            const studentPointResultsDocs = await this.queryInBatches(studentPointResultsRef, 'student_result_id', Array.from(actual_student_result_ids));
            //const studentPointResultsDocs = await this.queryInBatches(studentPointResultsRef, 'id', Array.from(referenced_point_result_ids_from_results)); // Alternative: query by ID if point_result_ids stores the actual ID
            const actual_student_point_result_ids = new Set(studentPointResultsDocs.map(d => d.id));

            // Fetch Scan Questions linked via Results (if any)
            const scanQuestionsFromResultsDocs = await this.queryInBatches(scanQuestionsRef, 'id', Array.from(referenced_scan_ids_from_results));

            // Combine Scan Questions from both sources
            const all_actual_scan_question_ids = new Set([...scanQuestionsFromPagesDocs.map(d => d.id), ...scanQuestionsFromResultsDocs.map(d => d.id)]);
            const actual_scan_question_image_ids_refs = new Set([
                ...scanQuestionsFromPagesDocs.map(d => d.data().image_id),
                ...scanQuestionsFromResultsDocs.map(d => d.data().image_id)
            ].filter(Boolean));

            console.log(`Test Cleanup (${this.id}): Found Actual - RubricPoints: ${actual_rubric_point_ids.size}, Sections: ${actual_section_ids.size}, StudentResults: ${actual_student_result_ids.size}, StudentPointResults: ${actual_student_point_result_ids.size}, ScanQuestions: ${all_actual_scan_question_ids.size}`);


            // --- Step 4: Fetch Actual File Documents from Firestore ---
            console.log(`Test Cleanup (${this.id}): Fetching actual file documents...`);
            const filesRef = collection(db, 'files');
            const mainTestFileIds = mainTestDocSnap.exists() ? Object.values(mainTestDocSnap.data().file_ids || {}) : [];

            const all_referenced_file_ids = new Set([
                ...mainTestFileIds,
                ...actual_page_image_ids_refs,
                ...actual_section_image_ids_refs,
                ...actual_scan_question_image_ids_refs
            ]);

            const fileDocs = await this.getContentById(Array.from(all_referenced_file_ids), 'files');
            const actual_file_ids = new Set(fileDocs.map(d => d.id));
            const actual_file_data_map = new Map(fileDocs.map(d => [d.id, d])); // Store data for bucket URL lookup

            console.log(`Test Cleanup (${this.id}): Found Actual - Files: ${actual_file_ids.size}`);

            // --- Step 5: Identify and Batch Delete Orphaned Firestore Documents ---
            console.log(`Test Cleanup (${this.id}): Identifying and batching orphaned Firestore documents for deletion...`);

            const collections_and_ids = [{
                    name: 'questions',
                    actual: actual_question_ids,
                    expected: expected_question_ids,
                    ref: collection(db, 'questions')
                },
                {
                    name: 'targets',
                    actual: actual_target_ids,
                    expected: expected_target_ids,
                    ref: collection(db, 'targets')
                },
                {
                    name: 'pages',
                    actual: actual_page_ids,
                    expected: expected_page_ids,
                    ref: collection(db, 'pages')
                },
                {
                    name: 'students',
                    actual: actual_student_ids,
                    expected: expected_student_ids,
                    ref: collection(db, 'students')
                },
                {
                    name: 'rubric_points',
                    actual: actual_rubric_point_ids,
                    expected: expected_rubric_point_ids,
                    ref: rubricPointsRef
                },
                {
                    name: 'sections',
                    actual: actual_section_ids,
                    expected: expected_section_ids,
                    ref: sectionsRef
                },
                {
                    name: 'scan_questions',
                    actual: all_actual_scan_question_ids,
                    expected: expected_scan_question_ids_instance,
                    ref: scanQuestionsRef
                },
                {
                    name: 'students_question_results',
                    actual: actual_student_result_ids,
                    expected: expected_student_result_ids,
                    ref: studentResultsRef
                },
                {
                    name: 'students_points_results',
                    actual: actual_student_point_result_ids,
                    expected: expected_student_point_result_ids,
                    ref: studentPointResultsRef
                },
                {
                    name: 'files',
                    actual: actual_file_ids,
                    expected: all_expected_file_ids,
                    ref: filesRef,
                    is_file: true
                },
            ];

            for (const {
                    name,
                    actual,
                    expected,
                    ref,
                    is_file
                } of collections_and_ids) {
                let orphans_in_collection = 0;
                for (const doc_id of actual) {
                    if (!expected.has(doc_id)) {
                        // Orphan detected
                        batch.delete(doc(ref, doc_id));
                        orphaned_firestore_count++;
                        orphans_in_collection++;

                        // If it's a file, prepare its storage object for deletion
                        if (is_file) {
                            const file_data = actual_file_data_map.get(doc_id);
                            if (file_data?.bucket_url) {
                                try {
                                    // Use bucket_url directly if it's a full gs:// or https:// URL
                                    const storage_ref = ref(storage, file_data.bucket_url);
                                    storage_refs_to_delete.push({
                                        ref: storage_ref,
                                        fileId: doc_id,
                                        bucketUrl: file_data.bucket_url
                                    });
                                } catch (url_error) {
                                    console.warn(`Test Cleanup (${this.id}): Could not create storage ref from URL for orphaned file ${doc_id}: ${file_data.bucket_url}`, url_error);
                                    // Fallback: Attempt deletion using bucket_route if available and URL failed
                                    if (file_data.bucket_route) {
                                        try {
                                            const storage_ref = ref(storage, file_data.bucket_route);
                                            storage_refs_to_delete.push({
                                                ref: storage_ref,
                                                fileId: doc_id,
                                                bucketUrl: `route:${file_data.bucket_route}`
                                            }); // Mark as route based
                                            console.log(`Test Cleanup (${this.id}): Using fallback bucket_route for orphaned file ${doc_id}`);
                                        } catch (route_error) {
                                            console.error(`Test Cleanup (${this.id}): Could not create storage ref from bucket_route either for orphaned file ${doc_id}: ${file_data.bucket_route}`, route_error);
                                        }
                                    }
                                }
                            } else {
                                console.warn(`Test Cleanup (${this.id}): Orphaned file document ${doc_id} missing bucket_url/route, cannot queue storage deletion.`);
                            }
                        }
                    }
                }
                if (orphans_in_collection > 0) {
                    console.log(`Test Cleanup (${this.id}): Found ${orphans_in_collection} orphaned documents in '${name}'.`);
                }
            }


            // --- Step 6: Commit Firestore Deletions ---
            if (orphaned_firestore_count > 0) {
                console.log(`Test Cleanup (${this.id}): Committing deletion of ${orphaned_firestore_count} orphaned Firestore documents...`);
                await batch.commit();
                console.log(`Test Cleanup (${this.id}): Firestore batch commit successful.`);
            } else {
                console.log(`Test Cleanup (${this.id}): No orphaned Firestore documents found.`);
            }

            // --- Step 7: Delete Orphaned Storage Files ---
            if (storage_refs_to_delete.length > 0) {
                console.log(`Test Cleanup (${this.id}): Attempting to delete ${storage_refs_to_delete.length} orphaned storage files...`);
                let deleted_storage_count = 0;
                const delete_promises = storage_refs_to_delete.map(({
                        ref: storage_ref,
                        fileId,
                        bucketUrl
                    }) =>
                    deleteObject(storage_ref)
                    .then(() => {
                        deleted_storage_count++;
                        // console.log(`Test Cleanup (${this.id}): Successfully deleted storage file: ${storage_ref.fullPath} (linked to doc ${fileId})`);
                    })
                    .catch((storage_error) => {
                        // Use bucketUrl for logging as ref.fullPath might error if created from invalid URL
                        const storagePathDesc = bucketUrl.startsWith('route:') ? bucketUrl.substring(6) : storage_ref.toString(); // Attempt to get a path description
                        if (storage_error.code === 'storage/object-not-found') {
                            console.warn(`Test Cleanup (${this.id}): Storage object not found (maybe already deleted?): ${storagePathDesc} (linked to doc ${fileId})`);
                        } else {
                            console.error(`Test Cleanup (${this.id}): Error deleting storage object ${storagePathDesc} (linked to doc ${fileId}):`, storage_error);
                        }
                    })
                );

                await Promise.all(delete_promises);
                console.log(`Test Cleanup (${this.id}): Storage deletion process finished. Successfully deleted ${deleted_storage_count} orphaned files.`);
            } else {
                console.log(`Test Cleanup (${this.id}): No orphaned storage files found to delete.`);
            }

            console.log(`Test Cleanup (${this.id}): Cleanup process completed.`);

        } catch (error) {
            console.error(`Test Cleanup (${this.id}): Error during cleanup process:`, error);
            // Consider how to handle partial failures
        } finally {
            this.loading.cleanup = false;
        }
    }


    // ... saveToDatabase, loadFromDatabase etc ...

    /**
     * Deletes the test document and ALL associated sub-collection documents
     * from Firestore, and associated files from Firebase Storage.
     * This is a destructive operation. Assumes all related documents have a 'test_id' field.
     */
    async deleteFromDatabase() {
        if (!this.id) {
            console.error(`Test Deletion: Cannot delete without a test ID.`);
            return; // Or throw error
        }
        console.log(`Test Deletion (${this.id}): Initiating full deletion...`);
        this.loading.cleanup = true; // Use cleanup flag to indicate busy state

        const test_id = this.id;
        const batch = writeBatch(db);
        const storage_refs_to_delete = []; // Store Storage References { ref: StorageReference, fileId: string }

        // Define collections directly linked via 'test_id'.
        // Ensure ALL collections storing data *exclusively* for this test are listed here.
        const related_collections = [
            'students_points_results',
            'students_question_results',
            'students',
            'rubric_points',
            'questions',
            'targets',
            'scan_questions', // Assumes these have test_id
            'sections', // Assumes these have test_id
            'pages',
            'files', // Special handling for storage path
            // Add any other collections linked by test_id
        ];

        try {
            // --- Step 1: Query and batch delete Firestore documents ---
            console.log(`Test Deletion (${this.id}): Querying related Firestore collections...`);
            let total_docs_to_delete = 0;

            await Promise.all(related_collections.map(async (collection_name) => {
                const collection_ref = collection(db, collection_name);
                const q = query(collection_ref, where("test_id", "==", test_id));
                const query_snapshot = await getDocs(q);
                let docs_in_collection = 0;

                query_snapshot.forEach((doc_snap) => {
                    // Add document deletion to the batch
                    batch.delete(doc_snap.ref);
                    total_docs_to_delete++;
                    docs_in_collection++;

                    // If this document is from the 'files' collection, get its storage reference
                    if (collection_name === 'files') {
                        const file_data = doc_snap.data();
                        if (file_data.bucket_url) {
                            try {
                                const storage_ref = ref(storage, file_data.bucket_url);
                                storage_refs_to_delete.push({
                                    ref: storage_ref,
                                    fileId: doc_snap.id
                                });
                            } catch (url_error) {
                                console.warn(`Test Deletion (${this.id}): Could not create storage ref from URL for file ${doc_snap.id}: ${file_data.bucket_url}`, url_error);
                                // Fallback attempt
                                if (file_data.bucket_route) {
                                    try {
                                        const storage_ref = ref(storage, file_data.bucket_route);
                                        storage_refs_to_delete.push({
                                            ref: storage_ref,
                                            fileId: doc_snap.id
                                        });
                                        console.log(`Test Deletion (${this.id}): Using fallback bucket_route for file ${doc_snap.id}`);
                                    } catch (route_error) {
                                        console.error(`Test Deletion (${this.id}): Could not create storage ref from bucket_route either for file ${doc_snap.id}: ${file_data.bucket_route}`, route_error);
                                    }
                                }
                            }
                        } else {
                            console.warn(`Test Deletion (${this.id}): File document ${doc_snap.id} missing bucket_url, cannot queue storage deletion.`);
                        }
                    }
                });
                if (docs_in_collection > 0) {
                    console.log(`Test Deletion (${this.id}): Added ${docs_in_collection} docs from '${collection_name}' to delete batch.`);
                }
            }));


            // Add the main test document itself to the batch deletion
            const main_doc_ref = doc(db, 'tests', test_id);
            batch.delete(main_doc_ref);
            total_docs_to_delete++;
            console.log(`Test Deletion (${this.id}): Added main test document to delete batch.`);
            console.log(`Test Deletion (${this.id}): Total Firestore documents to delete: ${total_docs_to_delete}`);

            // Commit all Firestore deletions atomically
            await batch.commit();
            console.log(`Test Deletion (${this.id}): Firestore batch commit successful.`);

            // --- Step 2: Delete associated Storage files ---
            if (storage_refs_to_delete.length > 0) {
                console.log(`Test Deletion (${this.id}): Attempting to delete ${storage_refs_to_delete.length} associated storage files...`);
                let deleted_storage_count = 0;
                const delete_promises = storage_refs_to_delete.map(({
                        ref: storage_ref,
                        fileId
                    }) =>
                    deleteObject(storage_ref)
                    .then(() => {
                        deleted_storage_count++;
                        // console.log(`Test Deletion (${this.id}): Successfully deleted storage file: ${storage_ref.fullPath} (linked to doc ${fileId})`);
                    })
                    .catch((storage_error) => {
                        if (storage_error.code === 'storage/object-not-found') {
                            console.warn(`Test Deletion (${this.id}): Storage object not found (maybe already deleted?): ${storage_ref.fullPath} (linked to doc ${fileId})`);
                        } else {
                            console.error(`Test Deletion (${this.id}): Error deleting storage object ${storage_ref.fullPath} (linked to doc ${fileId}):`, storage_error);
                        }
                    })
                );

                await Promise.all(delete_promises);
                console.log(`Test Deletion (${this.id}): Storage deletion process finished. Successfully deleted ${deleted_storage_count} files.`);
            } else {
                console.log(`Test Deletion (${this.id}): No associated storage files found to delete.`);
            }

            console.log(`Test Deletion (${this.id}): Full deletion completed successfully.`);

        } catch (error) {
            console.error(`Test Deletion (${this.id}): Error during full deletion:`, error);
            // Re-throw the error so the caller knows it failed
            throw error;
        } finally {
            this.loading.cleanup = false; // Reset loading flag
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

class ScanPage extends FirestoreBase {
    constructor({
        id = getRandomID(),
        student_id = null,
        test = null,
        images = {},
        squareData = [],
        sections = [],
        questions = [],
        total_result = {},
        context_data = {},
        selected_image_type = 'raw',
        square_data_image_raw=null
    }) {
        super('pages')

        // this.file = new File({ ...file, file_type: 'jpeg' }); // REMOVE File instance
        this.id = id
        this.test = test

        this.images = images
        this.setImages()

        this.student_id = student_id;

        this.squareData = squareData
        this.sections = sections
        this.questions = questions
        this.total_result = total_result
        this.context_data = new ContextData({
            ...context_data
        })
        this.square_data_image_raw = square_data_image_raw
        this.is_loading_all = false;
        this.loading = {
                all: false,

                student_id: false,
                crop: false,
                red_pen: false,

                detect_squares: false,
                detect_qr: false,

                create_sections: false,
                create_question: false,

            },
            this.selected_image_type = selected_image_type


    }
    get is_loading() {
        return Object.values(this.loading).some(e => e)
    }
    get image() { //Updated getter
        switch (this.selected_image_type) {
            case "raw":
                return this.images.original //NEW
                break;
            case "cropped":
                return this.images.cropped
                break;
            case "red_pen":
                return this.images.red_pen_extracted
                break;
            default:
                break;
        }

    }
    set image(val) { //Updated setter
        switch (this.selected_image_type) {
            case "raw":
                this.images.original.raw = val
                break;
                // case "colcor":
                //     this.images.color_corrected.raw = val
                //     break;
            case "cropped":
                this.images.cropped.raw = val
                break;
            case "red_pen":
                this.images.red_pen_extracted.raw = val
                break;
            default:
                break;
        }

    }
    get image_options() {
        const options = ['raw']
        if (this.images.cropped.url) {
            options.push('cropped')
        }
        if (this.images.red_pen_extracted.url) {
            options.push('red_pen')
        }
        return options
    }
    get data() {
        return {
            test_id: this.test?.id,
            id: this.id,
            student_id: this.student_id,
            image_ids: {
                original: this.images.original.id,
                cropped: this.images.cropped.id,
                red_pen_extracted: this.images.red_pen_extracted.id,
                // color_corrected: this.images.color_corrected.url,
            },
            // squareData: this.squareData,
            section_ids: this.sections.map(e => e.id),
            questions_ids: this.questions.map(e => e.id),
            total_result: this.total_result,
            // context_data: this.context_data,
            selected_image_type: this.selected_image_type,
        }
    }
    setImages() {
        if (!this.images) {
            this.images = {}
        }
        this.images = {
            original: new File({
                ...this.images.original,
                file_type: 'png',
                name: 'original',
                path: {
                    'pages': this.id,
                },
                test: this.test
            }),
            // color_corrected: new File({
            //     ...this.images.color_corrected,
            // file_type: 'png',
            //     name: 'color_corrected',
            //     path: {
            //         'pages': this.id,
            //     }, 
            //     test: this.test
            // }),
            red_pen_extracted: new File({
                ...this.images.red_pen_extracted,
                file_type: 'png',
                name: 'red_pen_extracted',
                path: {
                    'pages': this.id,
                },
                test: this.test
            }),
            cropped: new File({
                ...this.images.cropped,
                file_type: 'png',
                name: 'cropped',
                path: {
                    'pages': this.id,
                },
                test: this.test
            }),
        }
    }


    async cropImage() {
        try {
            this.loading.crop = true
            const base64_image = await this.image?.base64()
            if (!base64_image) {
                console.log('No image found during crop image for: ', this)
                return null
            }
            const response = await apiRequest('/crop', {
                Base64Image: base64_image
            });
            if (response) {
                this.selected_image_type = 'cropped'
                this.images.cropped.raw = response;
            } else {
                console.error('Error cropping image:', response.data);
            }

            this.loading.crop = false
        } catch (error) {
            console.error('API call to crop image failed:', error);
        }
        return this.images.cropped.raw;

    }
    // // Color correction and extraction of red pen marks
    async extractRedPen() {
        this.loading.red_pen = true
        const response = await apiRequest('/extract_red_pen', {
            Base64Image: this.image.raw,
        });
        console.log('extractRedPen: ', response)
        this.images.red_pen_extracted.raw = response.clean;
        this.loading.red_pen = false
        this.selected_image_type = 'red_pen'
        return this.images.red_pen_extracted.raw;
    }

    async detectQrSections() {
        this.loading.detect_qr = true
        const base64_image = await this.image?.base64()
        if (!base64_image) {
            console.log('No image found during qr detection for: ', this)
            return null
        }
        const response = await apiRequest('/get_qr_sections', {
            Base64Image: base64_image,
        });
        this.base64_square_image = response?.image || null
        response?.sections?.forEach(e => {
            this.addSection({
                ...e,
                is_qr_section: true
            })
        });
        console.log('detectQrSections: ', response)

        this.loading.detect_qr = false
        return this.base64_color_corrected;
    }
    addSection(data = {}) {
        this.sections.push(new ScanSection({
            ...data,
            index: this.sections.length,
            page: this,
            test: this.test
        }))
    }
    async detectStudentId() {
        this.loading.student_id = true
        const base64_image = await this.image?.base64()
        if (!base64_image) {
            console.log('No image found during student id detection for: ', this)
            return null
        }
        const response = await apiRequest('/get_student_id', {
            Base64Image: base64_image,
        });
        console.log('detectStudentId: ', response)

        this.student_id = response?.result?.text || null

        this.loading.student_id = false
    }
    // Detect squares on the image
    async detectSquares() {
        this.loading.detect_squares = true
        const base64_image = await this.image?.base64()
        if (!base64_image) {
            console.log('No image found during detect squares for: ', this)
            return null
        }
        const response = await apiRequest('/detect_squares', {
            Base64Image: base64_image,
        });
        this.squareData = response?.data || [];
        // this.base64_square_image = response?.image || ""
        this.loading.detect_squares = false
        return this.squareData;
    }
    addQuestion(data = {}) {
        this.questions.push(new ScanQuestion({
            student_id: this.student_id,
            ...data,
            test: this.test,
            page: this,
        }))
    }

    // Create sections based on square data
    async createSections() {
        this.loading.create_sections = true
        const base64_image = await this.image?.base64()
        if (!base64_image) {
            console.log('No image found during createSections for: ', this)
            return null
        }
        const response = await apiRequest('/extract_sections', {
            Base64Image: base64_image,
            square_data: this.squareData
        });
        if (response?.sections) {
            this.sections = []
            response.sections.forEach(section => this.addSection({
                images: Object.keys(section).reduce((data, e) => {
                    data[e] = {
                        raw: section[e]
                    }
                    return data
                }, {}),
            }));
        }
        this.loading.create_sections = false
    }

    // Extract text from sections, turning them into Question objects if they match the criteria
    async extractQuestions() {
        this.loading.create_question = true
        const base64_sections = await Promise.all(this.sections.map(async section => {
            return await section.images.question_selector.base64() || ""
        }))

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
            const filtered_sections = (await Promise.all(this.sections.filter(e => e.question_number == question_number).map(section => section.images.answer.base64()))).filter(e => e)
            const response = await apiRequest('/link_answer_sections', {
                sections: filtered_sections,
            })
            console.log('link answer: ', response)
            return {
                response,
                question_number
            }
        }))
        this.questions = response.map(e => this.addQuestion({
            image: {
                raw: e.response
            },
            question_number: e.question_number,
            page: this,
            test: this.test
        }))

        this.is_loading = false
    }
    async extractText() {
        this.is_loading = true
        await Promise.all(this.questions.map(question => question.extractText()))
        this.is_loading = false
    }
    async flipImage() {
        const base64 = await this.image.base64();
        this.image.raw = await rotateImage180(base64)
    }


    async saveToFirestoreBatch(batch) {
        await Promise.all([
            // done by students
            // Promise.all(this.questions.map(question => question.saveToFirestoreBatch(batch))),
            // DONT SAVE SECTIONS FOR STORAGE REASONS
            // await Promise.all(this.sections.map(section => section.saveToFirestoreBatch(batch))),
            // this.image.uploadAndSaveToFirestoreBatch(batch)
        ].flat(Infinity))

        super.saveToFirestoreBatch(batch)
    }
}

class ScanSection extends FirestoreBase {
    constructor({
        id = getRandomID(),
        page = null,
        images = {},
        question_number = null,
        question_number_data = null,
        is_qr_section = false,
        student_id = null,
        test = null,
        index = null
    }) {
        super('sections')
        this.id = id
        this.page = page
        this.test = test
        this.is_loading = false

        this.images = images
        this.setImages()

        this.is_qr_section = is_qr_section
        this.student_id = student_id
        this.question_number = question_number
        this.question_number_data = question_number_data
        this.index = index
    }
    get data() {
        return {
            id: this.id,
            page_id: this.page?.id,
            test_id: this.page?.test?.id,
            image_ids: {
                full: this.images.full?.id,
                section_finder: this.images.section_finder?.id,
                question_selector: this.images.question_selector?.id,
                answer: this.images.answer?.id,
            },
            question_number: this.question_number,
            question_number_data: this.question_number_data,
            is_qr_section: this.is_qr_section,
            student_id: this.student_id,
            index: this.index
        }
    }
    setImages() {
        if (!this.images) {
            this.images = {}
        }
        ['full', 'section_finder', 'question_selector', 'answer'].forEach(key => {

            this.images[key] = new File({
                ...this.images[key],
                file_type: 'png',
                name: key,
                path: {
                    'pages': this.page?.id || 'page_not_found',
                    'sections': null,
                },
                test: this.test,
                section_id: this.id,
            });
        });

    }
    async saveToFirestoreBatch(batch) {
        this.setImages()
        // await Promise.all(Object.values(this.images).map(image => image.uploadAndSaveToFirestoreBatch(batch)))

        super.saveToFirestoreBatch(batch)

    }
}

class ScanQuestion extends FirestoreBase {
    constructor({
        id = getRandomID(),
        test = null,
        student_id = null,
        student_handwriting_percent = "",
        image = {},
        question_number = "",
        text = "",
        page = null,
        is_loading = false
    }) {
        super('scan_questions')
        this.id = id
        this.test = test
        this.student_handwriting_percent = student_handwriting_percent
        this.page = page
        this.student_id = student_id
        this.image = image
        this.setImage()
        this.question_number = question_number
        this.text = text
        this.is_loading = is_loading
    }
    get data() {
        return {
            id: this.id,
            test_id: this.test.id,
            student_id: this.student_id,
            student_handwriting_percent: this.student_handwriting_percent,
            image_id: this.image.id,
            question_number: this.question_number,
            text: this.text,
            page_id: this.page_id,
            is_loading: this.is_loading,
        }
    }

    setImage(data = {}) {
        this.image = new File({
            ...this.image,
            ...data,
            file_type: 'png',
            test: this.test,
            path: {
                'student_id': this.student_id,
                'questions': this.question_number,
            },
        })
    }
    // Extract text from the section based on the bounding box
    async extractText(context = null, provider = null, model = null) {
        this.is_loading = true

        if (!context) {
            context = this.page.context_data
        }

        const base64 = await this.image.base64()

        const response = await apiRequest('/extract_text', {
            Base64Image: base64,
            questionText: context.getQuestion(this.question_number.toString()),
            rubricText: context.getRubric(this.question_number.toString()),
            contextText: context.getContext(this.question_number.toString()),
            provider: provider,
            model: model,
        });
        console.log('extractText: ', response)
        this.text = response.result?.correctly_spelled_text || "";
        // this.data = response
        this.is_loading = false
        return {
            text: this.text
        };
    }
    async saveToFirestoreBatch(batch) {
        await this.image.uploadAndSaveToFirestoreBatch(batch)

        super.saveToFirestoreBatch(batch)

    }
}

class Student extends FirestoreBase {
    constructor({
        id = getRandomID(),
        test = null,
        student_id = "",
        results = [],
    }) {
        super('students');
        this.test = test
        this.id = id
        this.student_id = student_id
        this.results = results

        this.results.forEach((e, index) => this.results[index].updatePoints())
        this.is_grading = false
    }
    setResults() {
        this.results.map(e => new StudentQuestionResult({
            ...e,
            student: this,
            test: this.test
        }))
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
    get data() {
        return {
            id: this.id,
            test_id: this.test?.id,
            student_id: this.student_id,
            result_ids: this.results.map(e => e.id),
        }
    }
    async grade() {
        this.is_grading = true
        await Promise.all(this.results.map(async question_result => {
            await question_result.grade()
        }))


        this.is_grading = false
    }
    async downloadStudentResult(feedback_field = false) {
        console.log('Starting download: ')
        await downloadResultPdf([this.result_pdf_data], feedback_field, 'LeerlingResultaat_' + this.student_id)
    }
    async saveToFirestoreBatch(batch) {
        await Promise.all([
            Promise.all(this.results.map(result => result.saveToFirestoreBatch(batch))),

        ].flat(Infinity))

        super.saveToFirestoreBatch(batch)
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
        scan = {},
        student_handwriting_percent = 0
    }) {
        super('students_question_results');
        this.id = id
        this.student = student
        this.grade_instance = grade_instance
        this.question_id = question_id
        this.feedback = feedback
        this.point_results = point_results
        this.setPointResults()
        this.scan = scan
        this.setScan()
        this.is_grading = false
        this.student_handwriting_percent = student_handwriting_percent

    }
    get question() {
        return this.student.test.questions.find(e => e.id == this.question_id) || new Question({})
    }
    get data() {
        return {
            id: this.id,
            student_id: this.student.id,
            test_id: this.test?.id,
            question_id: this.question_id,
            grade_instance: this.grade_instance,
            feedback: this.feedback,
            point_results: Object.keys(this.point_results).reduce((data, e) => {
                data[e] = this.point_results[e].data

                return data
            }, {}),
            // point_result_ids: Object.keys(this.point_results).reduce((data, e) => {
            //     data[this.point_results[e].id] = e

            //     return data
            // }, {}),
            scan_id: this.scan.id,
            student_handwriting_percent: this.student_handwriting_percent,
        }

    }
    updatePoints() {
        this.question.points.forEach((point, index) => {
            this.point_results[point.point_index] = new StudentPointResult({
                ...this.point_results[point.point_index],
                student_result: this,
                point_index: point.point_index
            })
        })
    }
    setPointResults(){
        this.question.points.forEach(point => {
            this.point_results[point.point_index] = new StudentPointResult({
                ...(this.point_results[point.point_index] ||  {}),
                student_result: this,
            })
        })
    }
    setScan(data = {}) {
        this.scan = new ScanQuestion({
            ...this.scan,
            ...data,
            student_id: this.student.student_id,
            test: this.student.test,
        })
    }
    async grade() {
        this.is_grading = true

        if ((!this.question.is_draw_question && this.scan.text.length == 0) ||
            (this.question.is_draw_question && this.scan?.url?.length && this.scan?.url?.length == 0)
        ) {
            console.log('No answer found for: student ', this.student.student_id, ' question: ', this.question.question_number)
            return
        }

        const context = this.student.test.test_context






        var response = await apiRequest('/grade', {
            gradeRules: this.student.test.grade_rules,
            rubric: context.getRubric(this.question.question_number),
            question: context.getQuestion(this.question.question_number),
            answer: this.question.is_draw_question ? "" : this.scan.text,
            studentImage: this.question.is_draw_question ? await this.scan.image.base64() : undefined,
            model: this.student.test.gpt_model,
            provider: this.student.test.gpt_provider,
        })


        console.log('Graded: student ', this.student.student_id, '    question: ', this.question.question_number, ':', response)

        if (response && response.result && response.result.points) {
            var lowest_point_index = 0
            const sorted_points_indecies = response.result.points.map(e => e.point_index).sort((a, b) => a - b)
            if (sorted_points_indecies.length > 0) {
                lowest_point_index = sorted_points_indecies[0]
            }

            this.setPointResults()

            this.feedback = response.result.feedback || response.result.total_feedback
            response.result.points.sort(function (a, b) {
                return a.point_index - b.point_index;
            }).forEach((response_point, index) => {
                // const index = this.points.findIndex(point => point.point.point_index = response_point.point_index)
                console.log(this.point_results, response_point, lowest_point_index)
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
    async saveToFirestoreBatch(batch) {
        await Promise.all([
            this.scan?.saveToFirestoreBatch(batch),
            // Object.values(this.point_results).map(e => e.saveToFirestoreBatch(batch))
        ].flat(Infinity))

        super.saveToFirestoreBatch(batch)
    }
}

class StudentPointResult extends FirestoreBase {
    constructor({
        id = getRandomID(),
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
    get data() {
        return {
            test_id: this.student_result?.student?.test?.id,
            student_id: this.student_result?.student?.id,
            question_id: this.student_result?.question?.id,
            student_result_id: this.student_result?.id,
            question_number: this.student_result?.question.question_number,
            point_id: this.point?.id,

            id: this.id,
            student_result_id: this.student_result.id,
            has_point: this.has_point,
            feedback: this.feedback,
            point_index: this.point_index,
        }
    }
    saveToFirestoreBatch(batch) {
        super.saveToFirestoreBatch(batch)
    }
}

class GradeInstance {
    constructor({
        id = getRandomID(),
        student_question_result = null,
        is_gpt = false,
        model = null,
        provider = null,
    }) {
        this.id = id;
        this.student_question_result = student_question_result;
        this.is_gpt = is_gpt
        this.model = model
        this.provider = provider
    }
    get data() {
        return {
            id: this.id,
            student_question_result: this.student_question_result,
            is_gpt: this.is_gpt,
            model: this.model,
            provider: this.provider,
        }
    }
}

class TestManager {
    constructor() {
        this.tests = []; // Holds loaded Test instances for the list view
        this.loading = false;
        this.searchQuery = '';
        this.dbCollection = collection(db, 'tests'); // Firestore collection reference
        this.loading = false
    }

    /**
     * Fetches tests belonging to the current user for display in a list.
     * Loads only the necessary data for the list view (ID, name, etc.).
     */
    async fetchTests() {
        this.loading = true;
        this.tests = []; // Clear previous tests
        const user_store = useUserStore()
        const currentUser = user_store.user;

        if (!currentUser) {
            console.error("TestManager: No user logged in.");
            this.loading = false;
            return;
        }
        const userId = currentUser.uid;

        try {
            // Query for tests owned by the current user
            const q = query(this.dbCollection,
                where('user_id', '==', userId),
                // Note: You might want to add orderBy('name') or orderBy('creationDate') later
            );

            const querySnapshot = await getDocs(q);

            // Use loadTestFromData to create lightweight Test instances
            this.tests = querySnapshot.docs.map(doc =>
                this.loadTestFromData({
                    id: doc.id,
                    ...doc.data()
                })
            );

            console.log(`TestManager: Fetched ${this.tests.length} tests for user ${userId}`);

        } catch (error) {
            console.error("TestManager: Error fetching tests:", error);
            this.tests = []; // Clear tests on error
        } finally {
            this.loading = false;
        }
    }

    /**
     * Fetches the basic data for a single test by its ID.
     * This is useful if you need to quickly get basic info without loading all children.
     * For a full test load (including questions, students etc.), use Test.prototype.loadFromDatabase(testId).
     * @param {string} testId - The ID of the test to fetch.
     * @returns {Promise<Test|null>} The loaded Test instance (basic data) or null if not found/error.
     */
    async fetchTest(testId) {
        this.loading = true;
        try {
            // Directly use the Test class's static-like method (inherited from FirestoreBase)
            // Note: This uses the getById from FirestoreBase, loading only the main doc data
            const testInstanceForLoading = new Test({}); // Create dummy instance to access prototype method
            const testDocData = await testInstanceForLoading.getById(testId);

            if (testDocData) {
                console.log(`TestManager: Fetched basic data for test ${testId}`);
                return this.loadTestFromData(testDocData); // Use the same loading logic
            } else {
                console.warn(`TestManager: Test with ID ${testId} not found.`);
                return null;
            }
        } catch (error) {
            console.error(`TestManager: Error fetching test ${testId}:`, error);
            return null;
        } finally {
            this.loading = false;
        }
    }

    /**
     * Creates a Test instance from raw Firestore data.
     * Intended for loading only the data needed for the TestManager's list view.
     * @param {object} testData - Raw data object from Firestore (including ID).
     * @returns {Test} A Test instance.
     */
    loadTestFromData(testData) {
        // Create a Test instance, potentially passing only essential data
        // The Test constructor seems to handle partial data reasonably well.
        const test = new Test({
            id: testData.id,
            user_id: testData.user_id,
            name: testData.name, // Main test name
            is_public: testData.is_public,
            gpt_provider: testData.gpt_provider,
            gpt_model: testData.gpt_model,
            grade_rules: testData.grade_rules,
            test_data_result: testData.test_data_result, // Might be large, consider excluding if not needed for list
            // Load settings objects as they contain important config and potentially the display name
            test_settings: testData.test_settings ? new TestPdfSettings(testData.test_settings) : undefined,
            gpt_test: testData.gpt_test ? new GptTestSettings(testData.gpt_test) : undefined,
            gpt_question: testData.gpt_question ? new GptQuestionSettings(testData.gpt_question) : undefined,

            // IMPORTANT: Don't load heavy arrays like questions, students, pages here
            // as it would be inefficient for the list view. The Test constructor
            // handles empty arrays if these fields are missing in testData.
        });
        // Ensure the test instance knows its parent (needed for settings classes etc.)
        if (test.gpt_test) test.gpt_test.test = test;
        if (test.gpt_question) test.gpt_question.test = test;
        if (test.test_settings) test.test_settings.test = test;

        return test;
    }


    /**
     * Deletes a test from Firestore and removes it from the local manager list.
     * Delegates the actual deletion logic (including children and storage) to the Test instance.
     * @param {string} testId - The ID of the test to delete.
     */
    async deleteTest(testId) {
        const testIndex = this.tests.findIndex(test => test.id === testId);
        if (testIndex === -1) {
            console.error(`TestManager: Test ${testId} not found in local list for deletion.`);
            // Optionally, fetch the test first to ensure it exists before attempting deletion
            // const testToDelete = await this.fetchTest(testId);
            // if (!testToDelete) { console.log(`TestManager: Test ${testId} does not exist in DB.`); return; }
            // await testToDelete.deleteFromDatabase(); // Delete it even if not in list
            return;
        }

        const test = this.tests[testIndex];
        console.log(`TestManager: Attempting to delete test ${testId} (${test.name || 'Unnamed Test'})`);

        try {
            this.loading = true; // Indicate loading during deletion

            // Delegate the full deletion logic to the Test instance's method
            await test.deleteFromDatabase();

            // Remove from the local array *only* if database deletion is successful
            this.tests.splice(testIndex, 1);
            console.log(`TestManager: Successfully deleted test ${testId} and removed from list.`);

        } catch (error) {
            console.error(`TestManager: Error deleting test ${testId}:`, error);
            // Optionally: show error message to user
            // Do NOT remove from the list if deletion failed
        } finally {
            this.loading = false;
        }
    }


    /**
     * Gets the filtered list of tests based on the searchQuery.
     * Filters by the name property within the test_settings object.
     * @returns {Array<Test>} Filtered array of Test instances.
     */
    get filteredTests() {
        if (!this.searchQuery) {
            return this.tests;
        }
        const query = this.searchQuery.toLowerCase().trim();
        if (!query) {
            return this.tests;
        }
        return this.tests.filter(test => {
            // Use the 'name' from the main Test object if available, otherwise fallback to settings
            const nameToSearch = (test.name || test.test_settings?.name || '').toLowerCase();
            return nameToSearch.includes(query);
        });
    }
}


export {
    FirestoreBase,
    User,
    File,
    Test,
    Question,
    RubricPoint,
    Target,
    ScanPage,
    ScanSection,
    ScanQuestion,
    Student,
    StudentQuestionResult,
    StudentPointResult,
    GptTestSettings,
    GptQuestionSettings,
    TestPdfSettings,
    GradeInstance,
    ContextData,
    TestManager
};