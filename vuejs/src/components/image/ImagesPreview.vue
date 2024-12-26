<template lang="pug">
v-card.pa-2.w-100.d-flex(
    color="#424242"
    :style="{'height': height}"
)
    p {{  $vuetify.mdAndUp}}
    div(:style="{'max-height': '100%', 'max-width': '130px', 'overflow-y': 'scroll'}" )
        div.w-100.d-flex.flex-column
            div.list-image.my-2(
                v-for="(item, index) in items"
                @click="selected_image_id=item.id"
                :class="{'selected-list-image': item.id==selected_image_id}"
                style="position: relative"

                
            )
                RequestLoader(
                    v-if="item.is_loading"
                )
                v-img(
                    :src="item.image"
                    style="min-width: 120px; min-height: 120px"
                )
                p.text-center {{ item.title }}
                v-divider(:vertical="!this.$vuetify.display.mdAndUp" color="white")
                div(v-if="hasDeleteButton" style="position: absolute; top: 0px; left: 0px")
                    v-icon(color="red" icon="mdi-delete" @click="$emit('delete', item.id)") 
    v-divider.px-1(vertical color="white")
    div.h-100(style="width: calc(100% - 126px); overflow-y: scroll")
        slot(
            v-if="selected_item"
            name="selected" 
            :item="selected_item"
        )
    //- div(style="width: calc(100% - 126px); max-height: 100%")
        div(v-if="!isBeforeAfter")
            img(
                v-if="items[selected_image_id]"
                style="height: 100%"
                v-fullscreen-img="{scaleOnHover: true}"
                :src="items[selected_image_id]" 
            )
        div.d-flex.flex-row(v-else-if="items[selected_image_id] && items[selected_image_id].length == 2")
            div(v-for="(image, index) in items[selected_image_id]")
                div(:style="{'width': 'calc((100% - (2px * '+items[selected_image_id].length+')) / '+items[selected_image_id].length+')'}")
                    p {{ titles[index] }}
                    div(v-if="(items[selected_image_id]?.[index]?.constructor === Array)")
                        img(
                            v-for="sub_image in items[selected_image_id][index]"
                            v-if="sub_image"
                            style="height: auto; max-width: 100%"
                            v-fullscreen-img="{scaleOnHover: true}"
                            :src="sub_image" 
                        )
                    div(v-else)
                        img(
                            v-if="items[selected_image_id][index]"
                            style="height: auto; max-width: 100%"
                            v-fullscreen-img="{scaleOnHover: true}"
                            :src="items[selected_image_id][index]" 
                        )
                    v-divider.mx-1(vertical)
            
</template>

<script>
// Data 


// Components
import RequestLoader from '@/components/sub/RequestLoader'

export default {
    name: 'ImagesPreview',
    components: {
        RequestLoader
    },
    props: {
        modelValue: {
            required: false,
            default: null
        },
        items: {
            default: [],
        },
        titles: {
            default: ['current', 'after', '']
        },
        height: {
            default: '100%',
        },
        hasDeleteButton: {
            default: false
        },
        isBeforeAfter: {
            default: false
        }
    },
    emits: ['update:modelValue','delete'],
    setup() {
        
    },
    data(){
        return {
            local_model_value: 0
        }
    },
    computed: {

        selected_image_id: {
            get(){return this.modelValue || this.local_model_value},
            set(val){
                // if (this.modelValue){
                this.$emit('update:modelValue', val)
                // } 
                this.local_model_value = val
            }
        },
        selected_item() {
            return this.items.find(e => e.id == this.selected_image_id)
        }
    },
    methods: {
    
    },
    watch: {
    
    },
    // created() {
    
    // },
    mounted() {
        
    },
    
    
}
</script>
    
<style scoped>
.list-image{
    aspect-ratio: 1/1;
    width: 100%;
    /* height: 120px; */
    border: solid rgba(0, 0, 0, 0) 2px;
    position: relative;
    

}
.selected-list-image{
    border: solid black 2px
}
</style>
