import './services/theme'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles/theme.css'
import './styles/ess.css'

createApp(App).use(router).mount('#app')
