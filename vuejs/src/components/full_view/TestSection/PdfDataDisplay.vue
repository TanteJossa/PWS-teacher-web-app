
<template lang="pug">
div(v-for="(item,index) in  test.files[selected_subsection.id].data")
    v-expansion-panels
        v-expansion-panel
            v-expansion-panel-title {{ item.type }}
            v-expansion-panel-text
                div(v-if="item.type == 'text'")
                    v-textarea(v-model="test.files[selected_subsection.id].data[index].data")
                div(v-if="item.type == 'image'")
                    img(style="height: 300px" :src="item.data")
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
