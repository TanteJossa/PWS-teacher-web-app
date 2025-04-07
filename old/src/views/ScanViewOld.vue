<template lang="pug">
div
    p {{ selected_step_index, selected_step}}
    v-stepper(v-model='selected_step_index' alt-labels)
        template(v-slot:default='{ prev, next }')
            v-stepper-header
                template(v-for='(step, index) in stepper_steps' :key='`${index}-step`')
                    v-stepper-item(
                        :complete='selected_step_index > index+1' 
                        :value="index+1"
                        :editable='index < selected_step_index'
                    ) {{ step }}
                    v-divider(v-if='index !== stepper_steps.length-1')
            
            v-stepper-window
                v-stepper-window-item.pa-0(
                    v-for='(step, index) in stepper_steps' 
                    :key='`${index-1}-content`' 
                    :value='index+1'
                )
                    h2 {{ step }}
                    div.w-100(v-if="step == 'load'")
                        ImagesPreview(
                            :images="images.map(e => e.original)"
                            height="500px"
                            :hasDeleteButton="true"
                            @delete="images.original.splice($event, 1)"
                        )
                        v-file-input(
                            label="foto's"
                            v-model="uploaded_images"
                            multiple
                            accept="image/*"
                        )
                        v-btn(@click="addUploadedImages") Voeg toe
                    div(v-if="step == 'fix'")
                        ImagesPreview(
                            :images="images.map((e, index) => [e.original, e.color_corrected])"
                            :titles="["before", "color_corrected"]"
                            height="500px"
                            :isBeforeAfter="true"
                        )
                    div(v-if="step == 'sections'")

                    div(v-if="step == 'text'")

                v-stepper-actions(
                    :disabled='false' 
                    @click:next='next' 
                    @click:prev='prev'
                )

</template>

<script>
// Data 
import { getRandomID }  from '@/helpers'

// Components
import ImagesPreview from '@/components/image/ImagesPreview.vue'

// Assets
import HAL from '@/assets/HAL.png'
import lege_student_row from '@/assets/lege_student_row.png'

export default {
    name: 'ScanView',
    components: {
        ImagesPreview
    },
    props: {
    
    },
    emits: [],
    setup() {
        
    },
    data(){
        return {
            stepper_steps: ['load', 'fix', 'sections', 'text'],
            selected_step_index: 2,

            pdf: null,
            uploaded_images: [],
            images: [
                
            ]
        }
    },
    computed: {
        selected_step(){return this.stepper_steps[this.selected_step_index]}
    },
    methods: {
        async convertImageToPNG(file) {
            // Read the file as a data URL
            const dataUrl = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Load the image
            const img = await new Promise((resolve, reject) => {
                const image = new Image();
                image.onload = () => resolve(image);
                image.onerror = reject;
                image.src = dataUrl;
            });

            // Draw the image onto a canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Convert the canvas content to a PNG data URL
            return canvas.toDataURL('image/png');
        },
        async addUploadedImages(){
            const png_images = await Promise.all(this.uploaded_images.map(e => this.convertImageToPNG(e)))
            png_images.forEach(e => this.addImage(e))
        },
        addImage(file){
            this.images.push({
                id: getRandomID(),
                original: file,
                is_loading: false,
                cropped: null,
                red_pen: null,
                color_corrected: null,
                sections: [],
                questions: []
            })
        }

        
    },
    watch: {
    
    },
    // created() {
    
    // },
    mounted() {
        this.addImage(HAL)
        this.addImage(lege_student_row)
    },
    
    
}
</script>
    
<style scoped>
    
</style>
