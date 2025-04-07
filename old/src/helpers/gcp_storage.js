//src/helpers/gcp_storage.js

import {
    Storage
} from '@google-cloud/storage';
import config from '@/config';

const storage = new Storage({
    projectId: config.gcp.projectId,
    // keyFilename: '@/creds/toetspws-bucket-manager-creds.json', //  If you're running this outside of GCP, you'll need a service account key
});

const bucket = storage.bucket(config.gcp.bucketName);

async function uploadFile(filePath, contents, contentType) {
    const file = bucket.file(filePath);

    try {
        await file.save(contents, {
            metadata: {
                contentType: contentType,
            },
            public: true, // Make the file publicly accessible
        });

        console.log(`${filePath} uploaded to ${config.gcp.bucketName}.`);
        return file.publicUrl(); // Return the public URL
    } catch (error) {
        console.error('ERROR:', error);
        throw error; // Re-throw to handle it in the calling function
    }
}

async function deleteFile(filePath) {
    const file = bucket.file(filePath);

    try {
        await file.delete();
        console.log(`${filePath} deleted from ${config.gcp.bucketName}.`);
    } catch (error) {
        if (error.code === 404) {
            console.log(`${filePath} not found in ${config.gcp.bucketName}.`);
        } else {
            console.error('ERROR:', error);
            throw error; // Re-throw to handle it in the calling function
        }
    }
}


export {
    uploadFile,
    deleteFile
};