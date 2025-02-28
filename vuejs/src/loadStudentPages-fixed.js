// --- START OF FILE loadStudentPages-fixed.js ---
/**
 * Fixed version of the loadStudentPages method for MainLayout.vue
 * Simply copy and paste this method into your MainLayout.vue file
 */

async loadStudentPages(event) {
    console.log(event);
    if (!event) {
        return;
    }
    
    // Initialize file structure to prevent null errors
    if (!this.test.files) {
        this.test.files = {};
    }
    
    if (!this.test.files.students) {
        this.test.files.students = {
            raw: null,
            data: null,
            url: null,
            location: null
        };
    }
    
    // Process files
    for (let i = 0; i < event.target.files.length; i++) {
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

// --- END OF FILE loadStudentPages-fixed.js ---