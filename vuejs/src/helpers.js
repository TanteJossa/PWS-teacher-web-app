import {
  read,
  utils
} from 'xlsx'
import _ from 'lodash'
import CircularJSON from 'circular-json'
import {
  v4 as uuidv4
} from 'uuid'
import axios from 'axios'
import {
    ref
} from 'vue'
import prettyMilliseconds from 'pretty-ms';


// import sharp from 'sharp';

/**
 * Loads the data and does a quick analysis
 *
 * Jonathan -- 28-09-'24
 */

function excelFileToJSON(file) {
  var reader = new FileReader();
  reader.readAsBinaryString(file);
  return new Promise((resolve, reject) => {
    reader.onload = function (e) {
      var data = e.target.result;
      var workbook = read(data, {
        type: "binary",
      });
      var result = {};
      workbook.SheetNames.forEach(function (sheetName) {
        var roa = utils.sheet_to_row_object_array(
          workbook.Sheets[sheetName]
        );
        if (roa.length > 0) {
          result[sheetName] = roa;
        }
      });
      resolve(result);
    };
  });
}

function sum(l) {
  return l.reduce((data, current) => data + current, 0)
}

function uncircularStringify(obj) {
  return CircularJSON.stringify(obj)
}

function erf(x, n) {
  const h = x / n;
  let sum = 0;

  for (let i = 1; i < n; i++) {
    const xi = i * h;
    sum += (i % 2 === 0 ? 4 : 2) * Math.exp(-xi * xi);
  }

  return 2 * h / 3 * (Math.exp(-x * x) + sum + 2 * Math.exp(0));
}

function average(data) {
  return sum(data) / data.length
}

// Standard Deviation function
function standardDeviation(data) {
  const average = sum(data) / data.length;
  return Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / (data.length - 1));
}

function decCount(num) {
  if (Math.floor(num.valueOf()) === num.valueOf()) return 0;
  return num.toString().split(".")[1].length || 0;
}

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function getRandomID() {
  return uuidv4()
}

function downloadJSON(object, filename) {
  const dataStr = JSON.stringify(object);
  const dataUri = 'data:text/json;charset=utf-8,' + encodeURIComponent(dataStr);

  const link = document.createElement('a');
  link.setAttribute('href', dataUri);
  link.setAttribute('download', filename + '.json');
  link.click();
}

function imageToPngBase64(imageSource) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      const base64String = canvas.toDataURL('image/png');
      resolve(base64String);
    };

    img.onerror = (error) => {
      reject(new Error(`Failed to load image: ${error.message || 'Unknown error'}`));
    };

    if (typeof imageSource === 'string') {
      // Assume it's a URL
      img.crossOrigin = 'Anonymous'; // For handling CORS if needed
      img.src = imageSource;
    } else if (imageSource instanceof File) {
      // Handle File object (from <input type="file">)
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target.result;
      };
      reader.onerror = () => {
        reject(new Error('Failed to read the file.'));
      };
      reader.readAsDataURL(imageSource);
    } else if (imageSource instanceof HTMLImageElement) {
      // Handle already loaded Image element
      img.src = imageSource.src;
    } else {
      reject(new Error('Unsupported image source type. Please provide a URL, File object, or HTMLImageElement.'));
    }
  });
}
async function rotateImage180(base64Image) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = image.width;
      canvas.height = image.height;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(Math.PI); // 180 degrees in radians
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
      ctx.drawImage(image, 0, 0);

      resolve(canvas.toDataURL('image/png'));
    };
    image.onerror = reject; // Handle potential errors
    image.src = base64Image;
  });
}
const delay = (ms) => new Promise(res => setTimeout(res, ms));

var total_requests = ref(0)
const use_localhost = false

var endpoint = (use_localhost&&(location.hostname === "localhost" || location.hostname === "127.0.0.1")) ? 'http://localhost:8080' : 'https://toetspws-function-771520566941.europe-west4.run.app'
axios.defaults.timeout = 360_000;

var active_requests = ref([])

const apiRequest = async (route, data) => {

    total_requests.value += 1
    try{
        const source = axios.CancelToken.source();
        var id = getRandomID()

        const removeRequest = () => {
                const index = active_requests.value.findIndex(e => e.id == id)    
                if (index != -1){
                    active_requests.value.splice(index, 1)
                }
        }

        var request = axios.post(
            endpoint+route, 
            data, 
            {
                cancelToken: source.token,
            }
        ).then( e => {
            removeRequest()
            return e
        }).catch(e => {
            removeRequest()
            return e
        });
        const request_datetime = new Date().getTime()
        active_requests.value.push({
            id: id,
            route: route,
            params: data,
            request: request,
            request_timestamp: request_datetime,
            source: source,
            prettyDuration: () => {return prettyMilliseconds(new Date().getTime() - request_datetime)} ,
            abort: () => {
                source.cancel("Request aborted")
                removeRequest()
            }

        })
        
        var response = await request

    } catch (e) {
        var response = {
            type: 'server error',
            error: e
        }
    }
    

    if (response.data
    && response.data.output){
        return response.data.output
    }

    console.warn('Request error', response)

    return response
}

function downloadFileFromBase64(base64String, filename = 'downloaded', datatype="pdf") {
    /**
    * Downloads a PDF file from a base64 encoded string.
    *
    * Args:
    *   base64String: The base64 encoded string of the PDF.
    *   filename: The desired filename for the downloaded PDF (optional, default: 'downloaded.pdf').
    */

    filename += '.' + datatype
    if (datatype == 'pdf'){
        var dataPrefix = 'data:application/pdf;base64,';
    } else if (datatype == 'docx'){
        var dataPrefix = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,'
    }
    const linkSource = base64String.startsWith(dataPrefix) ? base64String : `${dataPrefix}${base64String}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
    downloadLink.remove();
}
function blobToBase64(blob) {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

async function downloadTest(test_data, feedback_field=false, filename="Toets"){
    const result = await apiRequest('/test-pdf', {
        testData: test_data,
    })
    if (typeof result == 'string'){

        downloadFileFromBase64(result, filename, test_data["settings"]["output_type"])
    } else {
        console.log('error: ', result)
    }
    
}

async function downloadResultPdf(results, feedback_field=false, filename="StudentResult"){
    const result = await apiRequest('/student-result-pdf', {
        studentResults: results,
        addStudentFeedback: feedback_field
    })
    if (typeof result == 'string'){

        downloadFileFromBase64(result, filename)
    } else {
        console.log('error: ', result)
    }
    
}


export {
  excelFileToJSON,
  sum,
  uncircularStringify,
  erf,
  average,
  standardDeviation,
  decCount,
  isNumeric,
  getRandomID,
  downloadJSON,
  imageToPngBase64,
  rotateImage180,
  delay,
  apiRequest,
  downloadResultPdf,
  downloadFileFromBase64,
  downloadTest,
  total_requests,
  blobToBase64,
  active_requests
}
