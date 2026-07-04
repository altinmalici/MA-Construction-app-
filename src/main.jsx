import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { installGlobalErrorLogging } from './lib/errorLog.js'

// Unbehandelte Fehler + Promise-Rejections in die error_log-Tabelle melden.
installGlobalErrorLogging()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
