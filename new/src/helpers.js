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
const use_localhost = true


var endpoint = (use_localhost && (location.hostname === "localhost" || location.hostname === "127.0.0.1")) ? 'http://localhost:8080' : 'https://toetspws-function-771520566941.europe-west4.run.app'
axios.defaults.timeout = 360000;

var active_requests = ref([])
var finished_requests = ref([])
const apiRequest = async (route, data) => {

    total_requests.value += 1
    try {
        const source = axios.CancelToken.source();
        var id = getRandomID()

        const removeRequest = () => {
            const index = active_requests.value.findIndex(e => e.id == id)
            if (index != -1) {
                finished_requests.value.splice(index, 0, active_requests.value[index])
                if (finished_requests.value.length > 10) {
                    finished_requests.value.splice(10)
                }
                active_requests.value.splice(index, 1)
            }
        }

        var request = axios.post(
            endpoint + route,
            data, {
                cancelToken: source.token,
            }
        ).then(e => {
            request_data.response = e
            request_data.finished_timestamp = new Date().getTime()

            removeRequest()
            return e
        }).catch(e => {
            request_data.response = e

            removeRequest()
            return e
        });
        const request_datetime = new Date().getTime()
        const request_data = {
            id: id,
            index: active_requests.value.length,
            route: route,
            params: data,
            request: request,
            request_timestamp: request_datetime,
            finished_timestamp: null,
            source: source,
            response: null,
            prettyDuration: function () {
                if (this.finished_timestamp) {
                    return prettyMilliseconds(this.finished_timestamp - request_datetime)
                }
                return prettyMilliseconds(new Date().getTime() - request_datetime)
            },
            abort: () => {
                source.cancel("Request aborted")
                removeRequest()
            }

        }
        active_requests.value.push(request_data)


        var response = await request

    } catch (e) {
        var response = {
            type: 'server error',
            error: e
        }
    }


    if (response.data &&
        response.data.output) {
        return response.data.output
    }

    console.warn('Request error', response)

    return response
}


function downloadFileFromBase64(base64String, filename = 'downloaded', datatype = "pdf") {
    /**
     * Downloads a PDF file from a base64 encoded string.
     *
     * Args:
     *   base64String: The base64 encoded string of the PDF.
     *   filename: The desired filename for the downloaded PDF (optional, default: 'downloaded.pdf').
     */

    filename += '.' + datatype
    if (datatype == 'pdf') {
        var dataPrefix = 'data:application/pdf;base64,';
    } else if (datatype == 'docx') {
        var dataPrefix = 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,'
    }
    const linkSource = base64String.startsWith(dataPrefix) ? base64String : `${dataPrefix}${base64String}`;
    const downloadLink = document.createElement("a");
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
    downloadLink.remove();
}

function fetchFileAsBlob(url) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.responseType = 'blob';

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(xhr.response); // Resolve with the blob
            } else {
                console.error(`Request failed with status: ${xhr.status}`); // Reject if status is not OK
                resolve(null)
            }
        };

        xhr.onerror = () => {
            console.error('Network error'); // Reject on network
            resolve(null)
        };

        xhr.open('GET', url);
        xhr.send();
    });

}

async function downloadTest(test_data, feedback_field = false, filename = "Toets") {
    const result = await apiRequest('/test-pdf', {
        testData: test_data,
    })
    if (typeof result == 'string') {

        downloadFileFromBase64(result, filename, test_data.settings?.output_type)
    } else {
        console.log('error: ', result)
    }

}

async function downloadResultPdf(results, feedback_field = false, filename = "StudentResult") {
    const result = await apiRequest('/student-result-pdf', {
        studentResults: results,
        addStudentFeedback: feedback_field
    })
    if (typeof result == 'string') {

        downloadFileFromBase64(result, filename)
    } else {
        console.log('error: ', result)
    }

}

function blobToBase64(blob) {
    return new Promise((resolve, _) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

const objDeepEqual = (v1, v2) => {
    if (v1 === v2) return true
    if (v1 == null || v2 == null || typeof v1 != "object" || typeof v2 != "object") return false

    let vlkeys = Object.keys(v1)
    let v2keys = Object.keys(v2)
    if (vlkeys.length != v2keys.length) return false

    for (let key of vlkeys) {
        if (!v2keys.includes(key) || !isDeepEqual(v1[key], v2[key])) {
            return false
        }
    }
    return true

}

const arrDeepEqual = (arr1, arr2) => {
    return Array.isArray(arr1) &&
        Array.isArray(arr2) &&
        arr1.length === arr2.length &&
        arr1.every((val, index) => isDeepEqual(val, arr2[index]));
}

const isDeepEqual = (v1, v2) => {
    if (v1 === v2) return true
    if (typeof v1 != typeof v2) {
        return false
    }
    if (v1 instanceof Array) {
        return arrDeepEqual(v1, v2)
    }
    if (typeof v1 == 'object') {
        return objDeepEqual(v1, v2)
    }
    return _.isEqual(v1, v2)
}

/**
 * Splits an array into smaller arrays (chunks) of a specified size.
 *
 * @param {Array} array - The array to chunk.
 * @param {number} chunkSize - The desired size of each chunk. Must be a positive integer.
 * @returns {Array<Array>} An array of arrays, where each inner array is a chunk
 *                         of the original array. Returns an empty array if the input
 *                         is not an array or chunkSize is invalid. Returns an array
 *                         containing the original array if chunkSize is larger than
 *                         the array length.
 */
function chunkArray(array, chunkSize) {
    // Input validation
    if (!Array.isArray(array)) {
        console.error("chunkArray: Input must be an array.");
        return [];
    }
    if (typeof chunkSize !== 'number' || !Number.isInteger(chunkSize) || chunkSize <= 0) {
        console.error("chunkArray: chunkSize must be a positive integer.");
        // Decide on behavior: return empty, original, or throw error.
        // Returning empty might be safest for Firestore 'in' queries.
        return [];
    }

    if (chunkSize >= array.length) {
        // If chunk size is larger than array, return the array wrapped in another array
        // This matches the expected output format (array of arrays)
        // and avoids unnecessary processing.
        return [array];
    }

    const result = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        const chunk = array.slice(i, i + chunkSize);
        result.push(chunk);
    }
    return result;
}

const MAX_IMAGE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB
const TARGET_COMPRESSION_FORMAT = 'image/png'; // Force PNG for compressed output

// Helper to convert Base64 Data URI to ArrayBuffer
function base64ToArrayBuffer(base64) {
    try {
        const parts = base64.split(',');
        const base64Data = parts[1];
        const byteString = atob(base64Data);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return ab;
    } catch (e) {
        console.error("Error decoding base64 string:", e);
        return null;
    }
}

// Helper to compress image data to target size and return PNG Base64 Data URI
async function compressImageToPngBase64(imageData, originalMimeType) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        let objectUrl = null;

        img.onload = () => {
            console.log(`Original dimensions: ${img.width}x${img.height}`);
            let canvas = document.createElement('canvas');
            let ctx = canvas.getContext('2d');
            let currentWidth = img.width;
            let currentHeight = img.height;
            let scale = 1.0;
            let compressedDataUrl = '';

            // Iteratively reduce dimensions until the PNG base64 size is acceptable
            // Limit iterations to prevent infinite loops
            for (let i = 0; i < 8; i++) { // Max 8 resize attempts
                canvas.width = Math.max(1, Math.floor(currentWidth)); // Ensure width >= 1
                canvas.height = Math.max(1, Math.floor(currentHeight)); // Ensure height >= 1
                console.log(`Attempting resize to: ${canvas.width}x${canvas.height}`);

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                compressedDataUrl = canvas.toDataURL(TARGET_COMPRESSION_FORMAT);

                // Estimate byte size (Base64 string length * 3/4)
                const estimatedSize = compressedDataUrl.length * 0.75;
                console.log(`Generated PNG Base64, estimated size: ${estimatedSize.toFixed(0)} bytes`);

                if (estimatedSize <= MAX_IMAGE_SIZE_BYTES) {
                    console.log(`Compression successful at ${canvas.width}x${canvas.height}.`);
                    if (objectUrl) URL.revokeObjectURL(objectUrl);
                    resolve(compressedDataUrl); // Return the successful PNG Base64 string
                    return;
                }

                // Reduce dimensions for the next iteration
                // Use sqrt for scaling factor as area is the main driver of size
                scale = Math.sqrt(MAX_IMAGE_SIZE_BYTES / estimatedSize) * 0.95; // Apply safety margin
                currentWidth *= scale;
                currentHeight *= scale;

                if (currentWidth < 50 || currentHeight < 50) { // Stop if dimensions get too small
                    console.warn("Image dimensions too small after scaling, stopping compression.");
                    break;
                }
            }

            // If loop finishes without success
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            console.error(`Unable to compress image below ${MAX_IMAGE_SIZE_BYTES} bytes.`);
            reject(new Error(`Unable to compress image sufficiently.`));
        };

        img.onerror = (err) => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
            console.error("Error loading image for compression:", err);
            reject(new Error("Error loading image for compression"));
        };

        // Create Object URL from source data (Blob, ArrayBuffer, or convert Base64)
        if (imageData instanceof Blob) {
            objectUrl = URL.createObjectURL(imageData);
            img.src = objectUrl;
        } else if (imageData instanceof ArrayBuffer) {
            const blob = new Blob([imageData], {
                type: originalMimeType
            });
            objectUrl = URL.createObjectURL(blob);
            img.src = objectUrl;
        } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
            // Don't need object URL for Base64 source
            img.src = imageData;
        } else {
            reject(new Error("Unsupported image data type for compression"));
        }
    });
}

export {
    getRandomID,
    fetchFileAsBlob,
    downloadTest,
    downloadResultPdf,
    active_requests,
    finished_requests,
    apiRequest,
    downloadFileFromBase64,
    decCount,
    isNumeric,
    downloadJSON,
    imageToPngBase64,
    rotateImage180,
    delay,
    sum,
    uncircularStringify,
    erf,
    average,
    standardDeviation,
    blobToBase64,
    objDeepEqual,
    total_requests,
    chunkArray,
    compressImageToPngBase64,
    base64ToArrayBuffer,
    MAX_IMAGE_SIZE_BYTES,
    TARGET_COMPRESSION_FORMAT  
}