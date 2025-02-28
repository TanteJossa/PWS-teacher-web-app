// --- START OF FILE firebase-storage-usage.js ---
/**
 * This file shows example usage of the firebase-storage.js utilities
 * 
 * IMPORTANT: This is just a reference file - do not include in production code!
 * Copy the relevant code examples into scan_api_classes.js or other files as needed.
 */

import { File, cleanupTestFolder } from './firebase-storage.js';

// Example 1: How to upload a test PDF file
async function uploadTestPdf(testId, pdfBase64Data) {
    // Create a File instance
    const file = new File({
        test_id: testId,
        base64Data: pdfBase64Data,
        file_type: 'pdf'
    });
    
    // Upload the file to organized storage structure 
    // This will save to 'tests/{testId}/documents/{randomID}.pdf'
    const success = await file.storeFile(testId);
    
    if (success) {
        console.log(`PDF uploaded successfully to ${file.location}`);
        // Get a download URL if needed
        const downloadUrl = await file.getDownloadURL();
        
        // Store file metadata in Firestore (add this to your saveToDatabase method)
        const fileData = {
            test_id: testId,
            location: file.location,
            file_type: 'pdf'
        };
        // [Your Firestore code here]
        
        return file.location;
    } else {
        console.error('Failed to upload PDF');
        return null;
    }
}

// Example 2: How to handle student answer files
async function uploadStudentAnswer(testId, resultId, answerBase64) {
    const file = new File({
        test_id: testId,
        student_question_result_id: resultId,
        base64Data: answerBase64,
        file_type: 'jpeg'
    });
    
    // This will save to 'tests/{testId}/answers/{resultId}/{randomID}.jpeg'
    await file.storeFile(testId, resultId);
    
    // Example Firestore code to save metadata
    const fileData = {
        test_id: testId,
        student_question_result_id: resultId,
        location: file.location,
        file_type: 'jpeg'
    };
    // [Your Firestore code here]
}

// Example 3: How to save section files with better organization
async function uploadSectionFiles(testId, sectionId, sectionData) {
    // Upload section files with proper types for better organization
    
    // Full section image
    if (sectionData.fullImage) {
        const fullFile = new File({
            test_id: testId,
            base64Data: sectionData.fullImage,
            file_type: 'section_full' // Special type that affects storage path
        });
        await fullFile.storeFile(testId);
        // Store fullFile.location in your data model
    }
    
    // Question selector
    if (sectionData.selectorImage) {
        const selectorFile = new File({
            test_id: testId,
            base64Data: sectionData.selectorImage,
            file_type: 'section_question_selector'
        });
        await selectorFile.storeFile(testId);
        // Store selectorFile.location in your data model
    }
    
    // Answer section
    if (sectionData.answerImage) {
        const answerFile = new File({
            test_id: testId,
            base64Data: sectionData.answerImage,
            file_type: 'section_answer'
        });
        await answerFile.storeFile(testId);
        // Store answerFile.location in your data model
    }
}

// Example 4: Cleanup old files before saving new data
async function updateTestWithCleanup(testId, newData) {
    // Clean up old files first to avoid orphaned files
    await cleanupTestFolder(testId);
    
    // Then upload new files
    // [Your upload code here]
}

// Example 5: How to modify the saveTestFiles method in Test class
async function improvedSaveTestFiles(testId) {
    console.log("Starting Test Files Upload...");
    if (!testId) {
        console.error("Test ID is missing. Cannot save files.");
        return false;
    }

    try {
        // Define file mappings
        const filesToUpload = [
            {
                key: 'test',
                rawData: this.test_pdf_raw, // Assuming this is base64 data
                fileType: 'pdf'
            },
            {
                key: 'rubric',
                rawData: this.rubric_pdf_raw,
                fileType: 'pdf'
            },
            {
                key: 'students',
                rawData: this.student_pdf_raw,
                fileType: 'pdf'
            }
        ];

        // Process each file
        await Promise.all(filesToUpload.map(async fileInfo => {
            if (fileInfo.rawData) {
                const file = new File({
                    test_id: testId,
                    base64Data: fileInfo.rawData,
                    file_type: fileInfo.fileType
                });
                
                const success = await file.storeFile(testId);
                
                if (success) {
                    // Store location in your test object
                    this.files[fileInfo.key] = file.location;
                    
                    // Update Firestore with file metadata
                    const fileData = {
                        test_id: testId,
                        location: file.location,
                        file_type: fileInfo.fileType
                    };
                    
                    // Your Firestore code here...
                    
                    console.log(`${fileInfo.key} file uploaded to: ${file.location}`);
                }
            }
        }));

        return true;
    } catch (error) {
        console.error("Exception uploading test files:", error);
        return false;
    }
}

// Example 6: How to modify savePageAndSectionFiles method
async function improvedSavePageAndSectionFiles(testId) {
    console.log("Starting Page and Section Files Upload...");
    
    if (!testId) {
        console.error("Test ID is missing. Cannot save files.");
        return false;
    }

    try {
        // Upload page files
        for (const page of this.pages) {
            if (page.base64Image) {
                const pageFile = new File({
                    test_id: testId,
                    base64Data: page.base64Image,
                    file_type: 'jpeg'
                });
                
                await pageFile.storeFile(testId);
                
                // Store location for database update
                page.file_location = pageFile.location;
                
                // Process sections
                for (const section of page.sections) {
                    // Process all section files
                    const sectionFiles = [
                        {
                            data: section.base64_full,
                            type: 'section_full'
                        },
                        {
                            data: section.base64_section_finder,
                            type: 'section_finder'
                        },
                        {
                            data: section.base64_question_selector,
                            type: 'section_question_selector'
                        },
                        {
                            data: section.base64_answer,
                            type: 'section_answer'
                        }
                    ];
                    
                    // Upload each section file
                    for (const sectionFile of sectionFiles) {
                        if (sectionFile.data) {
                            const file = new File({
                                test_id: testId,
                                base64Data: sectionFile.data,
                                file_type: sectionFile.type
                            });
                            
                            await file.storeFile(testId);
                            
                            // Store file information based on type
                            switch(sectionFile.type) {
                                case 'section_full':
                                    section.full_file_location = file.location;
                                    break;
                                case 'section_finder':
                                    section.finder_file_location = file.location;
                                    break;
                                case 'section_question_selector':
                                    section.selector_file_location = file.location;
                                    break;
                                case 'section_answer':
                                    section.answer_file_location = file.location;
                                    break;
                            }
                            
                            // Your Firestore metadata update code here...
                        }
                    }
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error("Exception saving pages and sections:", error);
        return false;
    }
}

// --- END OF FILE firebase-storage-usage.js ---