<template lang="pug">
.pdf-viewer-container.h-100
    v-btn(@click="$router.go(-1)") Terug
    object.w-100(style="height: calc(100% - 40px)" :data="pdfSrc" type="application/pdf" class="internal")

</template>
<script>
import answer_print from '@/assets/answer_print.pdf'

export default {
  props: {
    pdfPath: {
       type: String,
       required: true,
     }
  },
  computed: {
    pdfSrc(){
       return answer_print //this.pdfPath;
    }
  }
}
</script>
<style scoped>
/* .pdf-viewer-container{
} */
</style>