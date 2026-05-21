/// <reference types="vite-plugin-pwa/client" />
// Safe JSON.stringify wrapper to prevent circular structure conversion errors globally
const originalStringify = JSON.stringify;
(JSON as any).stringify = function (value: any, replacer: any, space: any) {
  try {
    return originalStringify(value, replacer, space);
  } catch (err: any) {
    if (err && (err.message?.includes('circular') || err.message?.includes('Circular') || String(err).includes('circular'))) {
      const seen = new WeakSet();
      return originalStringify(value, function (this: any, key: string, val: any) {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        if (typeof replacer === 'function') {
          return replacer.call(this, key, val);
        }
        return val;
      }, space);
    }
    throw err;
  }
};

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      if (confirm('New content available. Reload?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('App ready to work offline');
    },
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
