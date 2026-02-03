import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import './index.css'

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    // We'll handle this inside the app UI
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('App ready for offline use');
  },
});

// Make update function available globally for the Settings modal
window.manualPwaUpdate = () => updateSW(true);

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
