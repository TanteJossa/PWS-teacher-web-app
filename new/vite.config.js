import {
    defineConfig
} from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify, {
    transformAssetUrls
} from 'vite-plugin-vuetify'
import {
    fileURLToPath,
    URL
} from 'node:url'

// https://vite.dev/config/
export default defineConfig({
    plugins: [
        vue({
            template: {
                transformAssetUrls
            }
        }),
        vuetify({
            autoImport: {
                labs: true
            }
        }),
    ],
    
    define: {
        'process.env': {}
    },
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src',
                import.meta.url))
        },
        extensions: [
            '.js',
            '.json',
            '.jsx',
            '.mjs',
            '.ts',
            '.tsx',
            '.vue',
        ],
    },
    server: {
        port: 3000,
    },
    optimizeDeps: {
        exclude: ['pdfjs-dist']
    }
})