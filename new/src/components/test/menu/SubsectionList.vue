
<template lang="pug">
v-list(
    :selected="[selected_subsection_id]"
    mandatory
)
    v-list-item(
        v-for="(section, index) in subsections"
        :key="section.id"
        :value="section.id"
        @click="$emit('update:selected_subsection_id', section.id)"
        nav
    ) {{ section.name }}
</template>

<script>
export default {
    name: 'SubsectionList',
    props: {
        subsections: {
            type: Array,
            required: true,
        },
        selected_subsection_id: {
            type: String,
            required: true,
        },
    },
    emits: ['update:selected_subsection_id'],
};
</script>
