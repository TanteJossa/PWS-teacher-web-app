<template lang="pug">
div(v-for="(item,index) in  (test.files[selected_subsection.id]?.extra_data || [])" :key="index")
    v-expansion-panels
        v-expansion-panel
            v-expansion-panel-title {{ item.type }} {{ index }}
            v-expansion-panel-text
                div(v-if="item.type == 'text'")
                    v-textarea(v-model="item.data" :label="item.type + ' ' + index")
                div(v-else-if="item.type == 'image'")
                    img(style="max-height: 300px" :src="item.data" :alt="'Image ' + index")
                div(v-else) Unknown data type
</template>

<script>
export default {
    name: 'PdfDataDisplay',
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true
        }
    },
};
</script>