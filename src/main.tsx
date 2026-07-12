import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { sceneStore } from './store/sceneStore'
import { seedScene } from './utils/seedData'

sceneStore.update(() => seedScene)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
