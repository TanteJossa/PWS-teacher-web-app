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
                            th #
                            th route
                            th params
                            th Model?
                            th(style="width: 100px") tijd
                            th abort
                    tbody
                        tr(v-for="(request, index) in active_requests")
                            td {{ index + 1}}

                            td {{ request.route }}
                            td
                                v-dialog(max-width="700")
                                    template(v-slot:activator="{ props: activatorProps }")
                                        v-btn(v-bind="activatorProps") Params 
                                    template(v-slot:default="{ isActive }")
                                        v-card(title="Params")
                                            v-card-text
                                                v-btn(density="compact" @click="log(request.params);") Log
                                                json-viewer(
                                                    :value="request.params" 
                                                    :expand-depth="0"
                                                    copyable 
                                                    boxed 
                                                )
                            td {{ request.params?.provider }} - {{ request.params?.model }}
                            td {{ request.prettyDuration() }} {{ rerender_timer ? '' : ''}}
                            td
                                v-icon(icon="mdi-close" @click="active_requests[index].abort()" color="red")
                v-divider.py-2
                v-expansion-panels(v-if="finished_requests.length > 0")
                    v-expansion-panel(title="Old" elevation="0")
                        v-expansion-panel-text
                            v-table
                                thead
                                    tr
                                        th #
                                        th route
                                        th params
                                        th Model?
                                        th(style="width: 100px") tijd
                                        th Response
                                tbody
                                    tr(v-for="(request, index) in finished_requests")
                                        td {{ index + 1}}
                                        td {{ request.route }}
                                        td
                                            v-dialog(max-width="700")
                                                template(v-slot:activator="{ props: activatorProps }")
                                                    v-btn(v-bind="activatorProps") Params 
                                                template(v-slot:default="{ isActive }")
                                                    v-card(title="Params")
                                                        v-card-text
                                                            v-btn(density="compact" @click="log(request.params);") Log
                                                            json-viewer(
                                                                :value="request.params" 
                                                                :expand-depth="0"
                                                                copyable 
                                                                boxed 
                                                            )
                                        td {{ request.params?.provider }} - {{ request.params?.model }}
                                        td {{ request.prettyDuration() }} {{ rerender_timer ? '' : ''}}
                                        td 
                                            v-dialog(max-width="700" v-if="request.response")
                                                template(v-slot:activator="{ props: activatorProps }")
                                                    v-btn(v-bind="activatorProps") Response 
                                                template(v-slot:default="{ isActive }")
                                                    v-card(title="Params")
                                                        v-card-text
                                                            v-btn(density="compact" @click="log(request.response);") Log
                                                            json-viewer(
                                                                :value="request.response" 
                                                                :expand-depth="0"
                                                                copyable 
                                                                boxed 
                                                            )
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
        finished_requests: {
            default: [],
            type: Array,
            required: false,
        }
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
