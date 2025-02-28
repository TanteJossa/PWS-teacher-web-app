// --- START OF FILE firebase-storage.js ---
import { storage } from './firebase.js';
import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject, 
    listAll 
} from "firebase/storage";
import { getRandomID } from '@/helpers';

/**
 * File class for handling uploads and downloads with Firebase Storage
 * Provides a more intuitive file structure and cleanup capabilities
 */
export class File {
    constructor({
        id = null,
        test_id = null,
        student_question_result_id = null,
        base64Data = null,
        location = null,
        file_type = 'jpeg',
        is_stored = false
    }) {
        this.id = id;
        this.test_id = test_id;
        this.student_question_result_id = student_question_result_id;
        this.base64Data = base64Data;
        this.location = location;
        this.file_type = file_type;
        this.is_stored = is_stored;
    }

    /**
     * Upload file to Firebase Storage with appropriate path structure
     * @param {string} testId - Test ID for organization
     * @param {string} resultId - Student result ID for answer files
     * @returns {boolean} - Success status
     */
    async storeFile(testId = null, resultId = null) {
        try {
            if (!this.base64Data) {
                console.error("No base64Data to store");
                return false;
            }

            // Use provided IDs or class properties
            const useTestId = testId || this.test_id;
            const useResultId = resultId || this.student_question_result_id;

            // Choose appropriate path based on context
            let storagePath;
            if (useResultId) {
                // Student answer files
                storagePath = `tests/${useTestId}/answers/${useResultId}/${getRandomID()}.${this.file_type}`;
            } else if (useTestId) {
                // Test-related files with organized subfolders
                if (this.file_type === 'section_full') {
                    storagePath = `tests/${useTestId}/sections/full/${getRandomID()}.jpeg`;
                } else if (this.file_type === 'section_finder') {
                    storagePath = `tests/${useTestId}/sections/finders/${getRandomID()}.jpeg`;
                } else if (this.file_type === 'section_question_selector') {
                    storagePath = `tests/${useTestId}/sections/selectors/${getRandomID()}.jpeg`;
                } else if (this.file_type === 'section_answer') {
                    storagePath = `tests/${useTestId}/sections/answers/${getRandomID()}.jpeg`;
                } else if (this.file_type === 'pdf') {
                    storagePath = `tests/${useTestId}/documents/${getRandomID()}.pdf`;
                } else {
                    storagePath = `tests/${useTestId}/images/${getRandomID()}.${this.file_type}`;
                }
            } else {
                // Fallback for miscellaneous uploads
                storagePath = `uploads/${getRandomID()}.${this.file_type}`;
            }

            // Create storage reference and upload the file
            const storageRef = ref(storage, storagePath);
            
            // Handle base64 data properly
            let uploadData;
            if (this.base64Data.includes('base64,')) {
                // Handle data URLs (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
                uploadData = this.base64Data.split('base64,')[1];
                uploadData = Uint8Array.from(atob(uploadData), c => c.charCodeAt(0));
            } else {
                // Handle raw base64 strings
                uploadData = Uint8Array.from(atob(this.base64Data), c => c.charCodeAt(0));
            }
            
            // Determine content type
            const contentType = this.getContentType();
            
            // Upload the file
            await uploadBytes(storageRef, uploadData, { contentType });
            
            // Update file properties
            this.location = storagePath;
            this.is_stored = true;
            this.test_id = useTestId;
            this.student_question_result_id = useResultId;
            
            console.log(`File uploaded successfully to ${storagePath}`);
            return true;
        } catch (error) {
            console.error("Error storing file to Firebase Storage:", error);
            return false;
        }
    }

    /**
     * Get content type based on file_type
     * @returns {string} - MIME type
     */
    getContentType() {
        switch(this.file_type) {
            case 'pdf': return 'application/pdf';
            case 'jpeg':
            case 'jpg': return 'image/jpeg';
            case 'png': return 'image/png';
            case 'section_full':
            case 'section_finder':
            case 'section_question_selector':
            case 'section_answer': return 'image/jpeg';
            default: return 'application/octet-stream';
        }
    }

    /**
     * Get download URL for the stored file
     * @returns {string|null} - Download URL or null if unavailable
     */
    async getDownloadURL() {
        if (!this.location || !this.is_stored) {
            console.error("File not stored or no location available");
            return null;
        }

        try {
            const storageRef = ref(storage, this.location);
            return await getDownloadURL(storageRef);
        } catch (error) {
            console.error("Error getting download URL:", error);
            return null;
        }
    }

    /**
     * Delete file from Firebase Storage
     * @returns {boolean} - Success status
     */
    async deleteFileFromStorage() {
        if (!this.location || !this.is_stored) {
            console.warn("No file to delete or file not stored");
            return true; // Nothing to delete, so technically successful
        }

        try {
            const storageRef = ref(storage, this.location);
            await deleteObject(storageRef);
            this.is_stored = false;
            this.location = null;
            console.log(`File deleted successfully from ${this.location}`);
            return true;
        } catch (error) {
            console.error("Error deleting file from storage:", error);
            return false;
        }
    }
}

/**
 * Clean up all files in a test folder
 * @param {string} testId - Test ID to clean up
 * @returns {boolean} - Success status
 */
export async function cleanupTestFolder(testId) {
    if (!testId) {
        console.error("No test ID provided for cleanup");
        return false;
    }

    try {
        const testFolderRef = ref(storage, `tests/${testId}`);
        
        // Recursively delete all files in the test folder
        await recursiveDelete(testFolderRef);
        
        console.log(`Successfully cleaned up files for test ${testId}`);
        return true;
    } catch (error) {
        console.error(`Error cleaning up test folder for test ${testId}:`, error);
        return false;
    }
}

/**
 * Recursively delete files and folders
 * @param {StorageReference} folderRef - Storage reference to folder
 */
async function recursiveDelete(folderRef) {
    try {
        // List all items in the folder
        const listResult = await listAll(folderRef);
        
        // Delete all files in the current folder
        await Promise.all(listResult.items.map(itemRef => {
            console.log(`Deleting file: ${itemRef.fullPath}`);
            return deleteObject(itemRef);
        }));
        
        // Recursively delete subfolders
        await Promise.all(listResult.prefixes.map(async prefixRef => {
            await recursiveDelete(prefixRef);
        }));
    } catch (error) {
        console.error(`Error in recursive delete for ${folderRef.fullPath}:`, error);
        throw error;
    }
}
// --- END OF FILE firebase-storage.js ---