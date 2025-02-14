
<template lang="pug">
div
    v-progress-linear(v-if="test.loading.structure" indeterminate style="position: fixed; top: 0; left: 0; z-index: 5")
    v-card()
        v-tabs(v-model="selected_test_source_local")
            v-tab(value="gpt") AI
            v-tab(value="pdf") PDF's
        v-card-text
            v-tabs-window(v-model="selected_test_source_local")
                v-tabs-window-item.w-100(value="gpt")
                    v-radio-group(v-model="test.gpt_test.school_type" inline)
                        v-radio(value="basisschool" label="basisschool")
                        v-radio(value="vmbo" label="vmbo")
                        v-radio(value="havo" label="havo")
                        v-radio(value="vwo" label="vwo")
                        v-radio(value="mbo" label="mbo")
                        v-radio(value="hbo" label="hbo")
                        v-radio(value="universiteit" label="universiteit")

                    v-number-input(type="number" v-model="test.gpt_test.school_year")
                    v-text-field(label="Vak" v-model="test.gpt_test.school_subject")
                    v-text-field(label="Onderwerp" v-model="test.gpt_test.subject")
                    v-textarea(label="geleerde stof (optioneel)" auto-grow :rows="2" v-model="test.gpt_test.learned")
                    v-textarea(label="Onderwerpen die voor moeten komen" hint="Scheiden met komma's" auto-grow :rows="2" v-model="test.gpt_test.requested_topics")
                    v-btn.mt-2(@click="test.generateGptTest()") Genereer vragen

                v-tabs-window-item(value="pdf")
                    v-btn(text="Laad structuur met gpt request uit pdfs" @click="test.loadTestStructure()" :loading="test.loading.structure")

    LearningTargets(:test="test")
    QuestionsEditor(:test="test")
    DownloadTest(:test="test")
</template>

<script>
import LearningTargets from '@/components/full_view/TestSection/LearningTargets.vue';
import QuestionsEditor from '@/components/full_view/TestSection/QuestionsEditor.vue';
import GenerateQuestion from '@/components/full_view/TestSection/GenerateQuestion.vue';
import DownloadTest from '@/components/full_view/TestSection/DownloadTest.vue';

export default {
    name: 'TestStructure',
    components: {
        LearningTargets,
        QuestionsEditor,
        GenerateQuestion,
        DownloadTest
    },
    props: {
        test: {
            type: Object,
            required: true,
        },
        selected_test_source: {
            type: String,
            required: true
        }
    },
    emits: ['update:selected_test_source'],

    computed: {
        selected_test_source_local: {
            get() {
                return this.selected_test_source
            },
            set(val) {
                this.$emit('update:selected_test_source', val)
            }
        }
    }
};
</script>
