import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { router } from './router'
import { registerServiceWorker } from './utils/register-sw'
import App from './App.vue'
import './styles/tailwind.css'

registerServiceWorker()

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
