import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { appBasePath } from '@/lib/paths'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={appBasePath}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
