<template lang="pug">
.pdf-viewer-container.h-100
    v-btn(@click="$router.go(-1)") Terug
    object.w-100(style="height: calc(100% - 40px)" :data="pdfSrc" type="application/pdf" class="internal")

</template>
<script>
import pws_pdf from '@/assets/PWS-NakijkenMetAi-JoostKoch-JonathanWijker.pdf'

export default {
  props: {
    pdfPath: {
       type: String,
       required: true,
     }
  },
  computed: {
    pdfSrc(){
       return pws_pdf //this.pdfPath;
    }
  }
}
</script>
<style scoped>
/* .pdf-viewer-container{
} */
</style>