import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from '../../web/src/router'
import App from '../../web/src/App.vue'
import '../../web/src/styles/tailwind.css'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
