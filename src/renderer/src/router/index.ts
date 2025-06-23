import { createRouter,createWebHashHistory } from "vue-router";

import Home from "@renderer/views/Home.vue";

export default createRouter({
    history:createWebHashHistory(),
    routes:[{path:'/',component:Home}]
})