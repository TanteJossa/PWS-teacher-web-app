// CONFIG & FUNCTIONS
import { createRouter, createWebHistory } from 'vue-router'

import AnalisisView from '@/views/AnalisisView'
import ScanView from '@/views/ScanView'
import FullView from '@/views/FullView.vue'
import HomeView from '@/views/HomeView.vue'
import PdfView from '@/views/PdfView.vue'

const routes = [
    {
        path: '/scan',
        name: 'scan',
        component: ScanView
    },
    {
        path: '/analyze',
        name: 'analisis',
        component: AnalisisView
    },

    {
      path: '/pdf',
      name: 'pdf',
      component: PdfView,
      props: true
    },
    {
        path: '/',
        name: 'full',
        component: FullView
    },
    {
        path: '/home',
        name: 'home',
        component: HomeView
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        redirect: '/'
    }
]
const scrollBehavior = (to, from, savedPosition) => {
    return savedPosition ||
        to.meta?.scrollPos ||
        { top: 0, left: 0 }
}
// history: createWebHistory(process.env.BASE_URL),
const router = createRouter({
  history: createWebHistory(),
  routes: routes,
  navigationFallback: {
    rewrite: "/index.html",
    exclude: ["/images/*.{png,jpg,gif}", "/css/*"]
  },
  scrollBehavior
})

export default router