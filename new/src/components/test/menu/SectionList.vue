<template lang="pug">
v-list(
    :selected="[selected_section_id]"
    mandatory
)
    v-list-item Onderdelen
    v-divider
    v-list-item(
        v-for="section in main_sections"
        :key="section.id"
        :value="section.id"
        @click="$emit('update:selected_section_id', section.id)"
    ) {{ section.name }}
</template>

<script>
export default {
    name: 'SectionList',
    props: {
        main_sections: {
            type: Array,
            required: true,
        },
        selected_section_id: {
            type: String,
            required: true,
        },
    },
    emits: ['update:selected_section_id'],
};
</script>
