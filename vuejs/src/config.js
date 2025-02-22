// src/config.js
export default {
  gcp: {
    bucketName: 'toets-pws-web-storage',
    projectId: 'toetsPWS'
  },
  supabase: {
    url: 'https://hnqkiddgoplbsmuagtwr.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhucWtpZGRnb3BsYnNtdWFndHdyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAxNzMzODAsImV4cCI6MjA1NTc0OTM4MH0.IyqjaYytYkP9pM3yzgKdtA8rQdn6kAKA105AfjQFal8'
  },
  apiEndpoint: process.env.NODE_ENV === 'development'
    ? 'http://localhost:3000'
    : 'https://toetspws-function-771520566941.europe-west4.run.app'
};
