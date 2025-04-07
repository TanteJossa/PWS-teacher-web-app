
<template lang="pug">
div.h-100
    div.h-100(v-if="selected_subsection.id == 'load_pages'")
        LoadPages(
            :test="test"
            :selected_subsection="selected_subsection"
            @load-student-pages="handleLoadStudentPages"
        )

    div.h-100(v-if="selected_subsection.id == 'scan_pages'")
        ScanPages(
            :test="test"
            v-model:selected_page_id="_selected_page_id"
            @update:selected_page_id="$emit('update:selected_page_id', $event)"

        )

    div.h-100(v-if="selected_subsection.id == 'generate_students'" style="position: relative")
        GenerateStudents(
            :test="test"
            v-model:selected_student_id="_selected_student_id"
            :selected_student="selected_student"
            :selected_student_index="selected_student_index"
            @update:selected_student_id="$emit('update:selected_student_id', $event)"
        )
</template>

<script>
import LoadPages from '@/components/test/ScanSection/LoadPages.vue';
import ScanPages from '@/components/test/ScanSection/ScanPages.vue';
import GenerateStudents from '@/components/test/ScanSection/GenerateStudents.vue';

export default {
    name: 'ScanSection',
    components: {
        LoadPages,
        ScanPages,
        GenerateStudents,
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
        selected_page_id: {
            type: String,
            required: false
        },
        selected_student_id: {
            type: String,
            required: false
        }
    },
    emits: ['update:selected_page_id', 'update:selected_student_id', 'load-student-pages'],
    methods: {
        handleLoadStudentPages(event) {
            this.$emit('load-student-pages', event) // Emit the event
        }
    },
    computed: {
        selected_student: {
            get() {
                return this.test.students.find(e => e.id == this.selected_student_id)
            },
            set(val) {
                const index = this.selected_student_index

                if (index != -1) {
                    this.test.students[index] = val
                }
            }
        },
        selected_student_index() {
            return this.test.students.findIndex(e => e.id == this.selected_student_id)
        },
        _selected_page_id: {
            get(){return this.selected_page_id},
            set(val){this.$emit('update:selected_page_id', val)}
        },
        _selected_student_id: {
            get(){return this.selected_student_id},
            set(val){this.$emit('update:selected_student_id', val)}
        },
    }
};
</script>
