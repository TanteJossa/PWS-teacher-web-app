# File Structure Fix Instructions

This guide explains how to fix file structure errors in the application, especially the error:
`MainLayout.vue:515 Uncaught (in promise) TypeError: Cannot set properties of null (setting 'raw')`

## 1. Add the File Fix to main.js

Add this code near the top of your `main.js` file:

```javascript
// Import the file structure fix
import { applyFileStructureFix } from './file-structure-fix'
```

Then, add this code before `app.mount('#app')`:

```javascript
// Apply file structure fix to prevent "Cannot set properties of null" errors
applyFileStructureFix(app)
```

## 2. Fix the MainLayout.vue file

Add this import to your MainLayout.vue file:

```javascript
import { ensureFileStructure } from './file-structure-fix';
```

Then, modify your loadStudentPages method:

```javascript
async loadStudentPages(event) {
    console.log(event)
    if (!event){
        return 
    }
    
    // Ensure file structure is properly initialized
    ensureFileStructure(this.test);
    
    for (const i = 0; i < event.target.files.length; i++){
        const file = event.target.files[0]
        if (file.type.startsWith('image/')) {
            const base64png = await imageToPngBase64(file)
            if (base64png) {
                if (this.test.files.students.data == null){
                    this.test.files.students.data = []
                }
                this.test.files.students.data.push(base64png)
                this.test.addPage(base64png)
            }
        }
        if (file.type.startsWith('application/pdf')) {
            this.test.files.students.raw = file
            this.test.files.students.url = URL.createObjectURL(file)
        }
    }
}
```

## 3. Fix any other components that manage files

For any other components that work with files, add this code at the start of their methods:

```javascript
// Ensure file structure is properly initialized
ensureFileStructure(this.test);
```

This applies to methods like:
- loadDataFromPdf
- handleFileChange
- Any other method that accesses test.files.*.raw or test.files.*.url

## 4. Update the Test class constructor

If you can modify the Test class in scan_api_classes.js, update the constructor to initialize the file structure:

```javascript
constructor({ /* other parameters */ }) {
    super('tests');
    this.id = id
    this.user_id = user_id;
    
    // Initialize file structure properly
    this.files = {
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
    };
    
    // ... rest of constructor code
}
```

## About the file-structure-fix.js

The `file-structure-fix.js` file provides utilities to ensure the file structure is always properly initialized:

1. `ensureFileStructure(test)`: Ensures all file objects and their properties exist
2. `FileStructureMixin`: A Vue mixin that automatically ensures proper file structure
3. `createSafeTestProxy(test)`: Creates a proxy for Test objects to automatically ensure file structure
4. `applyFileStructureFix(app)`: Applies file structure safety to the entire application
5. `patchTestClass()`: Fixes file handling in the Test constructor

These utilities help prevent errors like "Cannot set properties of null (setting 'raw')" by ensuring the file structure always exists before accessing it.