// NavigationDrawer.vue
<template lang="pug">
v-navigation-drawer(
    v-if="isDesktop"
    permanent
    nav
    width="160"
)
    v-list
        v-btn(
            text="Laad preload (200MB)"
            @click="loadPreload()"
            :loading="test.loading.preload"
        )
        v-btn.mt-1(
            text="Download Antwoordpagina"
            @click="downloadAnswerSheet()"
        )
        v-btn.mt-1.w-100(
            text="Bekijk PWS"
            href="/pdf"
        )
        p Aantal modellen: {{ test.total_model_count }}
        v-select(
            :items='["google", "openai", "deepseek", "alibaba"]'
            v-model="test.gpt_provider"
            @update:modelValue="test.gpt_model = test.gpt_models(action)?.[0]?.value"
        )
        v-select(
            :items="test.gpt_models(action)"
            v-model="test.gpt_model"
            mandatory
        )
    slot
    v-navigation-drawer(
        permanent
        nav
        width="160"
        v-if="selected_section_id != 'analyze' && isDesktop && hasSlot('drawer2')"
    )
        v-list
            slot(name="drawer2")
v-progress-linear(
    v-if="isDesktop && (is_loading || test.is_loading)" 
    indeterminate 
    :style="{'position': 'absolute', 'top': 0, 'left': 0, 'z-index': 5}"
)
v-toolbar(
    v-if="!isDesktop"
    app
    color="primary"
    loading="true"
    dark
    density="compact"
    elevation="0"
    extension-height="0"
    fixed
    style="position: relative"
)
    
    template(#append)
        v-icon(icon="mdi-menu" @click.stop="drawer = !drawer") 

    v-toolbar-title
        .d-flex.flex-row.align-end
            h3 Toets PWS 
            p( style="font-size: 13px" v-if="Object.values(test.loading).filter(e => e).length > 0") Laden:
                i {{ Object.keys(test.loading).filter(e => test.loading[e]).join(",") }}
            p(v-else style="font-size: 13px" ) Site is in development
        
    template(#extension)
        v-progress-linear(
            color="white"
            v-if="is_loading || test.is_loading" 
            indeterminate 
        )
v-navigation-drawer(
    v-model="drawer"
    v-if="!isDesktop"
    temporary
    location="top"  
    height="auto"
)   
    v-btn.w-100(variant="text" @click="drawer = !drawer") Sluit
    v-list.mx-2
        v-btn(
            text="Laad preload (200MB)"
            @click="loadPreload()"
            :loading="test.loading.preload"
        )
        v-btn(
            text="Download Antwoordpagina"
            @click="downloadAnswerSheet()"
        )
        v-btn(
            text="Bekijk PWS"
            href="/pdf"
        )
        p Aantal modellen: {{ test.total_model_count }}
        v-select(
            :items='["google", "openai", "deepseek", "alibaba"]'
            v-model="test.gpt_provider"
            @update:modelValue="test.gpt_model = test.gpt_models(action)?.[0]?.value"
        )
        v-select(
            :items="test.gpt_models(action)"
            v-model="test.gpt_model"
            mandatory
        )
    slot
    v-divider
    div(v-if="hasSlot('drawer2')")
        slot(
            name="drawer2"
        )
</template>

<script>
import { getCurrentInstance } from 'vue';

export default {
    name: 'NavigationDrawer',
    props: {
        test: {
            type: Object,
            required: true
        },
        action: {
            type: String,
            required: false
        },
        selected_section_id: {
            type: String,
            required: false
        },
        is_loading: {
            type: Boolean,
            required: false
        }
    },
    setup(props, { slots }) {
        const hasSlot = name => !!slots[name]
        return { hasSlot }
    },
    data() {
      return {
        drawer: false,
      }
    },
    computed: {
        isDesktop() {
          return this.$vuetify.display.mdAndUp;
        },
    },
    methods: {
        async loadPreload() {
            await this.$parent.loadPreload()
        },
        async downloadAnswerSheet() {
            await this.$parent.downloadAnswerSheet()

        }
    }
};
</script>