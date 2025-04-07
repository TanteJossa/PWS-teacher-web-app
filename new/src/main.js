/**
 * main.js
 *
 * Bootstraps Vuetify and other plugins then mounts the App`
 */

// Plugins
import { registerPlugins } from '@/plugins'
import vuePugPlugin from 'vue-pug-plugin'
import { createPinia } from 'pinia'
const pinia = createPinia()
import router from './router'
import pdfUtilsPlugin from './workers/pdf_utils';
import JsonViewer from 'vue-json-viewer'

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

const app = createApp(App)
registerPlugins(app)

app
    .use(pinia)
    .use(router)
    .use(vuePugPlugin)
    .use(pdfUtilsPlugin)
    .use(JsonViewer)

const globals = app.config.globalProperties

app.mount('#app')

export {
    globals
}
