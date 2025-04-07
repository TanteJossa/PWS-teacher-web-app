// CONFIG & FUNCTIONS
import { createRouter, createWebHistory } from 'vue-router'

// import AnalisisView from '@/views/AnalisisView'
// import ScanView from '@/views/ScanView'
// import FullView from '@/views/FullView.vue'
import HomeView from '@/views/HomeView.vue'
import PdfView from '@/views/PdfView.vue'
import AccountView from '@/views/AccountView.vue'
import TestBrowser from '@/views/TestBrowser.vue'
import NewTestView from '@/views/NewTestView.vue'
import TestView from '@/views/TestView.vue'
import AnswerSheetView from '@/views/AnswerSheetView.vue'
import DemoView from '@/views/DemoView.vue'

const routes = [
    // {
    //     path: '/scan',
    //     name: 'scan',
    //     component: ScanView
    // },
    // {
    //     path: '/analyze',
    //     name: 'analisis',
    //     component: AnalisisView
    // },

    {
      path: '/pdf',
      name: 'pdf',
      component: PdfView,
      props: true
    },
    {
      path: '/answer_sheet',
      name: 'answer_sheet',
      component: AnswerSheetView,
    },
    {
        path: '/',
        name: 'Home',
        component: HomeView
    },
    {
        path: '/demo',
        name: 'demo',
        component: DemoView
    },
    {
        path: '/account',
        name: 'account',
        component: AccountView
    },
    {
        path: '/tests',
        name: 'tests',
        component: TestBrowser
    },
    {
        path: '/new_test',
        name: 'new_test',
        component: NewTestView
    },
    {
        path: '/test/:id',
        name: 'test',
        component: TestView
    },
    // // {
    // //     path: '/home',
    // //     name: 'home',
    // //     component: HomeView
    // // },
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