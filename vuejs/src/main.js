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
import VueApexCharts from "vue3-apexcharts";
import { vFullscreenImgInstall } from 'maz-ui'
import router from './router'
import pdfUtilsPlugin from './pdf_utils';
import PDFObjectPlugin from 'pdfobject-vue';

// Components
import App from './App.vue'

// Composables
import { createApp } from 'vue'

const app = createApp(App)
registerPlugins(app)

app
    .use(VueApexCharts)
    .use(pinia)
    .use(router)
    .use(vFullscreenImgInstall)
    .use(vuePugPlugin)
    .use(pdfUtilsPlugin)
    .use(PDFObjectPlugin)

const globals = app.config.globalProperties

app.mount('#app')

export {
    globals
}
