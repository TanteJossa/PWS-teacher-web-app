import * as pdfjsLib from 'pdfjs-dist/build/pdf';
// Import the worker directly
import PdfWorker from '@/workers/pdf.worker.js?worker&inline';
import * as pdfjsWorker from  'pdfjs-dist/build/pdf.worker';


import {
    pdfToBase64Images as workerPdfToBase64Images,
    extractTextAndImages as workerExtractTextAndImages
} from '@/workers/pdf.worker.js'; // Import worker functions

const pdfUtilsPlugin = {
  install: (app) => {
    // Configure worker source
    pdfjsLib.GlobalWorkerOptions.workerSrc =  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.js`;

    app.config.globalProperties.$pdfToBase64Images = async (file) => {
      return new Promise(async (resolve) => {
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = async () => {
          const pdfData = fileReader.result;
          const base64Images = await workerPdfToBase64Images(pdfData);
          resolve(base64Images);
        };
      });
    };

    app.config.globalProperties.$extractTextAndImages = async (file) => {
      return new Promise(async (resolve) => {
        const fileReader = new FileReader();
        fileReader.readAsArrayBuffer(file);
        fileReader.onload = async () => {
          const pdfData = fileReader.result;
          const extractedData = await workerExtractTextAndImages(pdfData);
          resolve(extractedData);
        };
      });
    };
  },
};

// Configure worker source (only needs to be done once)
// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/legacy/build/pdf.worker.js', import.meta.url).href;

export default pdfUtilsPlugin;
