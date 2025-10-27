// src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
// import { AuthProvider } from './AuthContext' // 1. Comentar importação

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    {/* <AuthProvider> // 2. Comentar AuthProvider */}
      <App />
    {/* </AuthProvider> // 3. Comentar AuthProvider */}
  </BrowserRouter>
)
