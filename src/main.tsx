import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against browser extension and benign environment-specific console errors
if (typeof window !== 'undefined') {
  const ignorePatterns = [
    'Attempting to use a disconnected port object',
    'disconnected port object',
    'ResizeObserver loop completed with undelivered notifications',
    'ResizeObserver loop limit exceeded',
    'Failed to connect to MetaMask',
    'MetaMask',
    'ethereum',
    'Could not establish connection',
    'Receiving end does not exist'
  ];

  // Suppress console.error noise from browser extensions (e.g., MetaMask)
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorStr = args.map(arg => {
      if (arg instanceof Error) {
        return arg.message + ' ' + arg.stack;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');

    if (ignorePatterns.some(pat => errorStr.toLowerCase().includes(pat.toLowerCase()))) {
      // Quietly ignore MetaMask or browser extension error noise
      return;
    }
    originalConsoleError(...args);
  };

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || (event.error && event.error.message) || '';
    if (ignorePatterns.some(pat => errorMsg.toLowerCase().includes(pat.toLowerCase()))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const errorMsg = typeof reason === 'string' ? reason : (reason && reason.message) || '';
    if (ignorePatterns.some(pat => errorMsg.toLowerCase().includes(pat.toLowerCase()))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

