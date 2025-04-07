<!-- fsdjfklsdf -->
<template lang="pug">
div
    div(v-if=" !show_output")

        //- v-btn.w-100(style="border-radius: 5px 5px 0px 0px; " color="grey_border_color" @click="blurField()" elevation="0") sluit
        //- v-switch.pl-2.w-100( style="background: rgb(var(--v-theme-grey_border_color))" v-model="use_new_editor" label="Nieuwe editor" hide-details density="compact")


        v-textarea(
            hide-details
            ref="edit" 
            :label="label"
            v-model="marktex_input" 
            auto-grow 
            rows="1" 
            @blur="blurField()"
            density="compact"

        )

        v-card.mb-0.preview.live-preview-card(v-if="!show_output && marktex_input" variant="tonal" color="blue-grey")
            v-card-text.mt-0.pb-1.pt-1.marktex-output(v-html="compiledMarkTex" )
        

    //- input below is used to 'catch' the focus while moving between different input-fields to show the output
    input.catch-input(v-if="show_output" @focus="getFocus()")
    v-card.preview.preview-card.pb-1.w-auto(v-if="show_output" variant="outlined" @click="activateField()" style="min-height: 40px")
        v-card-subtitle.mt-1.preview-title() {{label}}
        v-card-text.mt-0.pb-1.pt-1.marktex-output(v-html="compiledMarkTex" style="min-width: 200px")
    //- div(v-html="compiledMarkTex")
</template>

<style scoped>


.radius .preview-card{
    border-radius: 5px
}

.catch-input{
    /* https://stackoverflow.com/a/25339638/3041820 */
    position: absolute; 
    left: -999em;
}
/* todo Make sure list-items displays properly! */
:deep(ol){
    margin-left: 20px !important;
}

:deep(ul){
    margin-left: 20px !important;
}

.preview-card{
    
    border-radius: 5px 5px 0px 0px;
    border-color: rgb(97, 97, 97);
    /* background-color: rgb(246, 246, 246); */
    /* margin-bottom: 25px; */
}

.pointer{
    cursor: pointer;
}

.hidepointer{
    cursor:default !important;
}

.live-preview-card{
    border-radius: 0px 0px 3px 3px;
    margin-top: 0px;
    /* margin-bottom: 25px; */
}
.preview-card:hover{
    /* background-color: rgb(248, 248, 248); */
}
.preview-title{
    font-size: 13px;
}

.nobackground{
    /* background: white; */
    margin-left: -16px;
    opacity: 1;
    pointer-events: none;
}

.custom-btn{
    cursor: pointer;
}
.custom-btn:hover{
    background: rgba(0, 0, 0, 0.1) !important; /* Adds hover effect to toolbar buttons */
}

:deep(h1),:deep(h2),:deep(h3),:deep(h4),:deep(h5),:deep(h6){
    margin-top: 16px !important; /* Add space below all headers */
    margin-bottom: 8px !important; /* Add space below all headers */
}
:deep(.marktex-output > p){
    margin-bottom: 8px !important; /* Add space below all paragraphs */
}
:deep(.marktex-output > p:last-child){
    margin-bottom: 0 !important; /* No space below the last paragraph */
}
.katex-html{
    display: none
}

</style>

<script>

import MarkdownIt from 'markdown-it';
import tm from 'markdown-it-texmath';
import markdownItMultiMdTable from 'markdown-it-multimd-table';
import markdownItTitle from 'markdown-it-title';
import katex from "katex";


let md = new MarkdownIt({
    html: false,

})
    .use(tm, {
        // engine: katex,
        delimiters: 'dollars',
        output: 'mathml'
    })
    .use(markdownItMultiMdTable,{
        multiline:  false,
        rowspan:    false,
        headerless: false,
        multibody:  true,
        aotolabel:  true,
    })
    .use(markdownItTitle, {
        level: 1,
        excerpt: 2
    });

export default{
    name: "MarkTexField",
    components: {},
    setup(){return {}},
    props: {
        label: String,
        modelValue: String,
        
    },
    emits: ["update:modelValue"],
    data(){
        return{
            require_focus: false,
            show_output: true,

        }
    },
    watch: {

    },
    computed: {

        marktex_input: {
            get() {
                let value = this.modelValue || ""
                return value
            },
            set(new_marktex){
                let new_value = new_marktex
                if(new_value == ""){new_value = null}
                
                if (new_value !== this.modelValue){

                    this.$emit("update:modelValue", new_value)
                }

            }
        },
        
        compiledMarkTex(){
            let input = this.marktex_input
            
            return md.render(input)
        }
    },
    methods:{
        
        blurField(){
            // console.log("check for btn click")
            if(this.btn_clicked){
                this.btn_clicked = false
                this.$refs.edit?.focus()
                return
            }
            // console.log("blurring")
            // if(this.marktex_input == ""){
            //     this.show_output = false
            // } else {
            // }
            this.show_output = true
            this.require_focus = false
        },
        activateField(){
            // console.log("activate")
            this.show_output = false
            this.require_focus = true
        },
        getFocus(){
            // console.log("getting focus")
            this.require_focus = true
            this.show_output = false
        },
    },
    updated(){
        // console.log("updated")
        if(!this.show_output && this.require_focus){
            this.$refs.edit?.focus()
        }
    },
    mounted(){
        if(this.marktex_input == ""){this.show_output = false}
        this.blurField()
    }
}

</script>
