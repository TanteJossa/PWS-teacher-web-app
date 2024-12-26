import {
  read,
  utils
} from 'xlsx'
import _ from 'lodash'
import CircularJSON from 'circular-json'
import {
  v4 as uuidv4
} from 'uuid'
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
  imageToPngBase64
}
