// --- START OF FILE fix-students-files.js ---
/**
 * Quick fix for the "Cannot set properties of null (setting 'raw')" error
 * 
 * To use this fix:
 * 1. Import it in your MainLayout.vue file:
 *    import { ensureFileStructure } from '@/fix-students-files.js';
 * 
 * 2. Call it at the start of your loadStudentPages method:
 *    ensureFileStructure(this.test);
 */

/**
 * Ensures the file structure is properly initialized
 * @param {Object} test - The test object
 */
export function ensureFileStructure(test) {
  if (!test) return;
  
  // Ensure files object exists
  if (!test.files) {
    test.files = {};
  }
  
  // Ensure students object exists
  if (!test.files.students) {
    test.files.students = {};
  }
  
  // Ensure test object exists
  if (!test.files.test) {
    test.files.test = {};
  }
  
  // Ensure rubric object exists
  if (!test.files.rubric) {
    test.files.rubric = {};
  }
}

/**
 * Add this code to your loadStudentPages method to fix the error:
 * 
 * async loadStudentPages(event) {
 *     // Initialize file structure
 *     ensureFileStructure(this.test);
 *     
 *     // Rest of your code...
 *     if (!event) return;
 *     
 *     for (let i = 0; i < event.target.files.length; i++) {
 *         const file = event.target.files[i];
 *         
 *         if (file.type.startsWith('image/')) {
 *             const base64png = await imageToPngBase64(file);
 *             if (base64png) {
 *                 if (!this.test.files.students.data) {
 *                     this.test.files.students.data = [];
 *                 }
 *                 this.test.files.students.data.push(base64png);
 *                 this.test.addPage(base64png);
 *             }
 *         }
 *         
 *         if (file.type.startsWith('application/pdf')) {
 *             this.test.files.students.raw = file;
 *             this.test.files.students.url = URL.createObjectURL(file);
 *         }
 *     }
 * }
 */

// --- END OF FILE fix-students-files.js ---