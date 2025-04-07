/**
 * Unified file handling system for the application
 */
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase-config';

export class FileHandler {
    static async uploadFile(file, testId, fileType) {
        if (!file || !testId) return null;
        
        const storagePath = `tests/${testId}/${fileType}.pdf`;
        const storageRef = ref(storage, storagePath);
        
        try {
            const snapshot = await uploadBytes(storageRef, file, {
                contentType: 'application/pdf'
            });
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            return {
                raw: file,
                url: URL.createObjectURL(file),
                location: storagePath,
                downloadURL
            };
        } catch (error) {
            console.error(`Error uploading ${fileType} file:`, error);
            return null;
        }
    }

    static async uploadStudentFiles(files, testId) {
        const results = {
            raw: null,
            url: null,
            location: null,
            data: []
        };

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const base64Data = await this.fileToBase64(file);
                results.data.push(base64Data);
            } else if (file.type === 'application/pdf') {
                const storagePath = `tests/${testId}/students.pdf`;
                const storageRef = ref(storage, storagePath);
                
                await uploadBytes(storageRef, file, {
                    contentType: 'application/pdf'
                });
                
                results.raw = file;
                results.url = URL.createObjectURL(file);
                results.location = storagePath;
            }
        }

        return results;
    }

    static async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
}