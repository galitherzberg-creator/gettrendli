import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Apply stored theme synchronously before first paint to prevent flash
try {
  const theme = JSON.parse(localStorage.getItem('gt_theme') || '"light"')
  document.documentElement.setAttribute('data-theme', theme)
} catch {}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
