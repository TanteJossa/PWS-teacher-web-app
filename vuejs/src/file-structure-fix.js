// --- START OF FILE file-structure-fix.js ---
/**
 * Fix for file structure related errors in the PWS Teacher Web App
 * Prevents errors like: "Cannot set properties of null (setting 'raw')"
 * 
 * This file provides utility functions to ensure the file structure is always properly initialized.
 */

/**
 * Ensures the file structure is properly initialized in a Test object
 * @param {Object} test - The test object
 * @returns {Object} - The updated test object
 */
export function ensureFileStructure(test) {
  if (!test) return test;
  
  // Ensure files object exists
  if (!test.files) {
    test.files = {};
  }
  
  // Ensure all file objects exist
  const fileTypes = ['students', 'test', 'rubric'];
  fileTypes.forEach(type => {
    if (!test.files[type]) {
      test.files[type] = {};
    }
    
    // Ensure all standard properties exist
    const props = ['raw', 'data', 'url', 'location'];
    props.forEach(prop => {
      if (test.files[type][prop] === undefined) {
        // For data, initialize as an array if not present
        if (prop === 'data') {
          test.files[type][prop] = [];
        } else {
          test.files[type][prop] = null;
        }
      }
    });
  });
  
  return test;
}

/**
 * A Vue mixin that automatically ensures proper file structure 
 * when Test objects are used in Vue components
 */
export const FileStructureMixin = {
  mounted() {
    if (this.test) {
      ensureFileStructure(this.test);
    }
  },
  methods: {
    // Safe method to set file properties
    safeSetFileProperty(fileType, property, value) {
      if (!this.test) return;
      
      ensureFileStructure(this.test);
      this.test.files[fileType][property] = value;
    },
    
    // Safe method to get file properties
    safeGetFileProperty(fileType, property) {
      if (!this.test) return null;
      
      ensureFileStructure(this.test);
      return this.test.files[fileType][property];
    }
  }
};

/**
 * Create a proxy for a Test object to automatically ensure file structure
 * @param {Object} test - The test object to proxy
 * @returns {Proxy} - A proxied test object that ensures file structure
 */
export function createSafeTestProxy(test) {
  return new Proxy(test, {
    get(target, prop) {
      // If accessing files, make sure structure is valid
      if (prop === 'files') {
        ensureFileStructure(target);
      }
      return target[prop];
    }
  });
}

/**
 * Apply file structure safety to the entire application
 * @param {Object} app - The Vue app instance
 */
export function applyFileStructureFix(app) {
  // Global mixin to ensure file structure in all components
  app.mixin({
    created() {
      if (this.test) {
        ensureFileStructure(this.test);
      }
    },
    beforeUpdate() {
      if (this.test) {
        ensureFileStructure(this.test);
      }
    }
  });
}

/**
 * Fix file handling in the Test constructor
 * Call this function in your main.js
 */
export function patchTestClass() {
  // If the Test class is available in the global scope
  if (window.Test) {
    const originalConstructor = window.Test;
    
    // Replace constructor with safe version
    window.Test = function(...args) {
      const test = new originalConstructor(...args);
      return ensureFileStructure(test);
    };
    
    // Ensure prototype chain is preserved
    window.Test.prototype = originalConstructor.prototype;
  }
}

// --- END OF FILE file-structure-fix.js ---