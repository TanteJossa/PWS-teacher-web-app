<template lang="pug">
span.marktex(v-html="compiledMarkTex")
</template>

<style scoped>



:deep(.katex-mathml){
    /* somehow, this katex-mathml added weird whitespace below parent containers */
    display: none !important;
}

:deep(ol){
    margin-left: 30px !important;
}

:deep(ul){
    margin-left: 30px !important;
}
:deep(.katex-display){
    overflow-x: scroll !important;
    overflow-y: auto !important;
    padding-top: 8px !important;
    padding-bottom: 8px !important;
}

:deep(p){
    /* Add space below all paragraphs */
    margin-bottom: 8px; 
}
:deep(p:last-child){
    /* No space below the last paragraph */
    margin-bottom: 0; 
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
    name: "MarkTexDisplay",
    props: {
        text: String,
    },
    computed: {
        
        compiledMarkTex(){
            let output_text = this.text || ""

            return md.render(output_text)
        }
    },
    methods: {

    }
}

</script>