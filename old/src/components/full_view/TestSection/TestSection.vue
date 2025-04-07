
<template lang="pug">
div.h-100()
    PdfLoader(
        v-if="selected_subsection.id == 'test' || selected_subsection.id == 'rubric'"
        :test="test"
        :selected_subsection="selected_subsection"
    )

    TestStructure(
        v-if="selected_subsection.id == 'structure'"
        :test="test"
        :selected_test_source="selected_test_source"
        @update:selected_test_source="$emit('update:selected_test_source', $event)"
    )
</template>

<script>
import PdfLoader from '@/components/full_view/TestSection/PdfLoader.vue';
import TestStructure from '@/components/full_view/TestSection/TestStructure.vue';

export default {
    name: 'TestSection',
    components: {
        PdfLoader,
        TestStructure,
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_subsection: {
            type: Object,
            required: true
        },
        selected_test_source: {
            type: String,
            required: true
        }
    },
    emits: ['update:selected_test_source'],
};
</script>
