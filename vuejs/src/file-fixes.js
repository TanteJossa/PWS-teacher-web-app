// --- START OF FILE file-fixes.js ---
/**
 * This file contains fixes for file handling in the application.
 * It patches the existing code to prevent file-related errors.
 */

/**
 * Initialize the file structure properly for a Test object
 * 
 * @param {Object} test - The Test object to initialize
 * @returns {Object} - The same Test object with properly initialized file structure
 */
export function initializeFileStructure(test) {
    if (!test.files) {
        test.files = {};
    }

    const fileTypes = ['test', 'rubric', 'students'];
    
    fileTypes.forEach(type => {
        if (!test.files[type] || typeof test.files[type] !== 'object') {
            test.files[type] = {
                raw: null,
                data: type === 'students' ? [] : null,
                url: null,
                location: null
            };
        }
    });

    return test;
}

/**
 * Safely load student files (PDF or images) into the Test object
 * 
 * @param {Object} test - The Test object
 * @param {Event|File} fileEvent - File input event or File object
 * @returns {Promise<void>}
 */
export async function safelyLoadStudentFiles(test, fileEvent) {
    initializeFileStructure(test);
    
    if (!fileEvent || !fileEvent.target || !fileEvent.target.files) return;
    
    const results = await FileHandler.uploadStudentFiles(
        Array.from(fileEvent.target.files),
        test.id
    );
    
    test.files.students = {
        ...test.files.students,
        ...results
    };
}

/**
 * Safely load a PDF file (test or rubric) into the Test object
 * 
 * @param {Object} test - The Test object
 * @param {File} file - The PDF file
 * @param {string} fileType - 'test' or 'rubric'
 * @returns {Promise<void>}
 */
export async function safelyLoadPdf(test, file, fileType) {
    if (!file || !['test', 'rubric'].includes(fileType)) return;
    
    initializeFileStructure(test);
    
    const result = await FileHandler.uploadFile(file, test.id, fileType);
    
    if (result) {
        test.files[fileType] = result;
        test[`${fileType}_pdf_raw`] = result.raw;
    }
}

/**
 * Convert a File object to a base64 string
 * 
 * @param {File} file - The file to convert
 * @returns {Promise<string>} - Base64 string
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

/**
 * Apply fixes to a Test class instance
 * This patches the instance to prevent errors in file handling
 * 
 * @param {Object} testInstance - The Test instance to patch
 */
export function applyTestClassFixes(testInstance) {
    // Initialize file structure
    initializeFileStructure(testInstance);
    
    // Patch saveTestFiles method if it has issues
    const originalSaveTestFiles = testInstance.saveTestFiles;
    testInstance.saveTestFiles = async function(testId) {
        try {
            // Call original method with error handling
            return await originalSaveTestFiles.call(this, testId);
        } catch (error) {
            console.error("Error in saveTestFiles:", error);
            
            // Fallback implementation
            console.log("Using fallback file upload method");
            
            if (!testId) {
                console.error("Test ID is missing. Cannot save files.");
                return false;
            }
            
            try {
                // Process PDF files using our safer mechanism
                const filesToUpload = [
                    { 
                        key: 'test',
                        rawFile: this.test_pdf_raw || this.files.test.raw,
                        storagePath: `tests/${testId}/test.pdf`,
                        contentType: 'application/pdf',
                        pathKey: 'test'
                    },
                    { 
                        key: 'rubric',
                        rawFile: this.rubric_pdf_raw || this.files.rubric.raw,
                        storagePath: `tests/${testId}/rubric.pdf`,
                        contentType: 'application/pdf',
                        pathKey: 'rubric'
                    },
                    { 
                        key: 'students',
                        rawFile: this.student_pdf_raw || this.files.students.raw,
                        storagePath: `tests/${testId}/students.pdf`,
                        contentType: 'application/pdf',
                        pathKey: 'students'
                    }
                ];
                
                // Process each file for upload
                await Promise.all(filesToUpload.map(async fileInfo => {
                    if (fileInfo.rawFile) {
                        const storageRef = ref(storage, fileInfo.storagePath);
                        
                        await uploadBytes(storageRef, fileInfo.rawFile, {
                            contentType: fileInfo.contentType
                        });
                        
                        // Update file path in test object
                        if (!this.files[fileInfo.pathKey]) {
                            this.files[fileInfo.pathKey] = {};
                        }
                        this.files[fileInfo.pathKey].location = fileInfo.storagePath;
                        
                        // Update Firestore database with file metadata
                        const fileData = {
                            test_id: testId,
                            location: fileInfo.storagePath,
                            file_type: fileInfo.contentType.split('/')[1]
                        };
                        
                        await addDoc(collection(db, 'files'), fileData);
                        
                        console.log(`${fileInfo.key} file uploaded to: ${fileInfo.storagePath}`);
                    }
                }));
                
                return true;
            } catch (e) {
                console.error("Exception in fallback file upload:", e);
                return false;
            }
        }
    };
}

// --- END OF FILE file-fixes.js ---
