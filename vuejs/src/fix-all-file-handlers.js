// --- START OF FILE fix-all-file-handlers.js ---
/**
 * Functions to safely handle file properties without null errors
 * This is a direct solution to fixing file-related errors throughout the app
 */

/**
 * Ensures a file structure exists on a test object
 * @param {Object} test - The test object
 */
export function ensureFileStructure(test) {
  if (!test) return;
  
  // Initialize files object if it doesn't exist
  if (!test.files) {
    test.files = {};
  }
  
  // Initialize file objects if they don't exist
  const fileTypes = ['students', 'test', 'rubric'];
  fileTypes.forEach(type => {
    if (!test.files[type]) {
      test.files[type] = {};
    }
  });
}

/**
 * Safely sets a file property on a test object
 * @param {Object} test - The test object
 * @param {string} fileType - The file type (students, test, rubric)
 * @param {string} property - The property name (raw, data, url, location)
 * @param {*} value - The value to set
 */
export function safeSetFile(test, fileType, property, value) {
  ensureFileStructure(test);
  test.files[fileType][property] = value;
}

/**
 * Safely gets a file property from a test object
 * @param {Object} test - The test object
 * @param {string} fileType - The file type (students, test, rubric)
 * @param {string} property - The property name (raw, data, url, location)
 * @returns {*} The property value, or null if not found
 */
export function safeGetFile(test, fileType, property) {
  ensureFileStructure(test);
  return test.files[fileType][property];
}

/**
 * Fixed loadStudentPages method
 * @param {Object} test - The test object
 * @param {Event} event - The file input event
 * @param {Function} imageToPngBase64 - The function to convert images
 * @param {Function} addPage - The function to add a page to the test
 */
export async function safeLoadStudentPages(test, event, imageToPngBase64, addPage) {
  if (!event) return;
  
  ensureFileStructure(test);
  
  for (let i = 0; i < event.target.files.length; i++) {
    const file = event.target.files[i];
    
    if (file.type.startsWith('image/')) {
      const base64png = await imageToPngBase64(file);
      if (base64png) {
        if (!test.files.students.data) {
          test.files.students.data = [];
        }
        test.files.students.data.push(base64png);
        if (typeof addPage === 'function') {
          addPage(base64png);
        } else if (typeof test.addPage === 'function') {
          test.addPage(base64png);
        }
      }
    }
    
    if (file.type.startsWith('application/pdf')) {
      test.files.students.raw = file;
      test.files.students.url = URL.createObjectURL(file);
    }
  }
}

/**
 * Fixed method to handle file changes (PDF or other files)
 * @param {Object} test - The test object
 * @param {string} fileType - The file type (students, test, rubric)
 * @param {File} file - The file to handle
 */
export function safeHandleFileChange(test, fileType, file) {
  if (!file) return;
  
  ensureFileStructure(test);
  
  test.files[fileType].raw = file;
  test.files[fileType].url = URL.createObjectURL(file);
}

/**
 * Fixed method to load data from PDF
 * @param {Object} test - The test object
 * @param {string} fileType - The file type (students, test, rubric)
 * @param {Function} extractFn - The function to extract data from PDF
 */
export async function safeLoadDataFromPdf(test, fileType, extractFn) {
  ensureFileStructure(test);
  
  const file = test.files[fileType].raw;
  if (!file) return;
  
  if (typeof extractFn === 'function') {
    test.files[fileType].data = await extractFn(file);
  }
}

// --- END OF FILE fix-all-file-handlers.js ---