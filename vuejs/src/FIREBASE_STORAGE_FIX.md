# Firebase Storage Fix Guide

This guide helps you fix Firebase Storage issues in your application. The application has been having trouble with file uploads to Firebase Storage, along with a specific error related to `MainLayout.vue:371 Uncaught (in promise) TypeError: Cannot set properties of null (setting 'raw')`.

## What's Provided

1. **Complete Replacement File System**
   - `firebase-storage.js`: A complete file handling system for Firebase Storage
   - `file-fixes.js`: Utilities to fix file structure and handling issues

2. **Usage Examples**
   - `firebase-storage-usage.js`: Shows how to use the new storage system

## How to Fix the Issues

### Step 1: Update File Imports

In your `MainLayout.vue` file, add this import:

```javascript
import { initializeFileStructure, safelyLoadStudentFiles } from '@/file-fixes.js';
```

### Step 2: Initialize File Structure in Mounted

Add this code to the `mounted()` hook in `MainLayout.vue`:

```javascript
mounted() {
    // Initialize test file structure
    initializeFileStructure(this.test);
    
    setInterval(() => {
        this.rerender_timer = !this.rerender_timer
    }, 100);
}
```

### Step 3: Fix the loadStudentPages Method

Replace your `loadStudentPages` method with:

```javascript
async loadStudentPages(event) {
    console.log(event)
    if (!event){
        return 
    }
    
    // Initialize file structure if needed
    initializeFileStructure(this.test);
    
    try {
        // Use the safer file loading utility
        await safelyLoadStudentFiles(this.test, event);
    } catch (error) {
        console.error("Error loading student files:", error);
        
        // Fallback to original implementation if needed
        for (let i = 0; i < event.target.files.length; i++){
            const file = event.target.files[i];
            
            if (file.type.startsWith('image/')) {
                const base64png = await imageToPngBase64(file);
                if (base64png) {
                    if (!this.test.files.students.data) {
                        this.test.files.students.data = [];
                    }
                    this.test.files.students.data.push(base64png);
                    this.test.addPage(base64png);
                }
            }
            
            if (file.type.startsWith('application/pdf')) {
                this.test.files.students.raw = file;
                this.test.files.students.url = URL.createObjectURL(file);
            }
        }
    }
}
```

### Step 4: Modify the Test Class Constructor 

In `scan_api_classes.js`, update the Test constructor to properly initialize the file objects:

```javascript
constructor({
    id = null,
    user_id = null,
    files = {
        test: {
            raw: null,
            data: null,
            url: null,
            location: null
        },
        rubric: {
            raw: null,
            data: null,
            url: null,
            location: null
        },
        students: {
            raw: null,
            data: null,
            url: null,
            location: null
        },
    },
    // Rest of constructor parameters...
})
```

### Step 5: Use the New File Management System

When working with file uploads, use the methods from `firebase-storage.js` to ensure proper file handling. For example:

```javascript
import { File, cleanupTestFolder } from './firebase-storage.js';

// Before saving a new test
await cleanupTestFolder(testId);

// Upload a file with proper organization
const file = new File({
    test_id: testId,
    base64Data: pdfBase64Data,
    file_type: 'pdf'
});

await file.storeFile(testId);
```

## Additional Benefits

- Better organized storage structure
- Protection against orphaned files
- Proper error handling
- Automatic cleanup of old files
- Smart path generation based on file type

By implementing these changes, your Firebase Storage uploads will be more reliable and organized.