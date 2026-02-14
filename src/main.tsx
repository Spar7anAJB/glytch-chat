import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const isElectronRuntime = Boolean(window.electronAPI?.isElectron)
const app = <App />

createRoot(document.getElementById('root')!).render(
  isElectronRuntime ? app : <StrictMode>{app}</StrictMode>,
)
