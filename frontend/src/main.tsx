import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

console.log('[main] module loaded')
console.log('[main] React =', React)
console.log('[main] StrictMode =', React?.StrictMode)

const container = document.getElementById('root')
console.log('[main] container =', container)

if (!container) {
  console.error('[main] NO #root element!')
} else {
  try {
    const root = ReactDOM.createRoot(container)
    console.log('[main] root created')
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
    console.log('[main] render called')
  } catch (e) {
    console.error('[main] FATAL', e)
  }
}