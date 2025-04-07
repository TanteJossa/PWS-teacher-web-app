
<template lang="pug">
v-dialog(max-width="700")
    template(v-slot:activator="{ props: activatorProps }")
        v-btn(v-bind="activatorProps") Requests ({{ active_requests.length }})
    template(v-slot:default="{ isActive }")
        v-card(title="Requests")
            v-btn(@click="active_requests.forEach((e,index) => {active_requests[index].abort()})") Abort all
            v-card-text
                v-table
                    thead
                        tr
                            th route
                            th params
                            th Model?
                            th(style="width: 100px") tijd
                            th abort
                    tbody
                        tr(v-for="(request, index) in active_requests")
                            td {{ request.route }}
                            td
                                v-btn(density="compact" @click="log(request.params)") params
                            td {{ request.params?.provider }} - {{ request.params?.model }}
                            td {{ request.prettyDuration() }} {{ rerender_timer ? '' : ''}}
                            td
                                v-icon(icon="mdi-close" @click="active_requests[index].abort()" color="red")
</template>

<script>
import { ref } from 'vue';
export default {
    name: 'RequestDialog',
    props: {
        active_requests: {
            type: Array,
            required: true,
        },
    },
    setup() {
        const rerender_timer = ref(true);
        setInterval(() => {
          rerender_timer.value = !rerender_timer.value;
        }, 100);
    return { rerender_timer };
  },
    methods: {
        log(data) {
            console.log(data)
        }
    }
};
</script>
