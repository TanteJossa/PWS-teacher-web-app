// --- START OF FILE quick-fix.js ---
/**
 * QUICK FIX for "Cannot set properties of null (setting 'raw')" error
 * 
 * HOW TO USE:
 * 
 * 1. Add this line at the top of your loadStudentPages method in MainLayout.vue:
 *    if (!this.test.files) this.test.files = {}; if (!this.test.files.students) this.test.files.students = {};
 * 
 * That's it! This single line will prevent the error by ensuring the file structure exists.
 * 
 * FULL SOLUTION:
 * For a more comprehensive solution, replace your loadStudentPages method with this:
 */

async loadStudentPages(event) {
  console.log(event);
  if (!event) return;
  
  // FIX: Ensure file structure exists
  if (!this.test.files) this.test.files = {};
  if (!this.test.files.students) this.test.files.students = {};
  
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

// --- END OF FILE quick-fix.js ---