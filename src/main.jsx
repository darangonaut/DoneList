import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { LazyMotion, domMax } from "framer-motion"
import App from './App.jsx'
import './index.css'

// Register PWA Service Worker
const updateSW = registerSW({
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('pwa-update-available'));
  },
  onOfflineReady() {
    console.log('App ready for offline use');
  },
});

window.manualPwaUpdate = () => updateSW(true);

const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <LazyMotion features={domMax} strict>
        <App />
      </LazyMotion>
    </React.StrictMode>
  );
}
