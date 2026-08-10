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
    'Receiving end does not exist',
    'extension'
  ];

  const filterArgs = (args: any[]) => {
    return args.map(arg => {
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
  };

  // Suppress console.error & console.warn noise from browser extensions (e.g., MetaMask)
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const errorStr = filterArgs(args);
    if (ignorePatterns.some(pat => errorStr.toLowerCase().includes(pat.toLowerCase()))) {
      return;
    }
    originalConsoleError(...args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: any[]) => {
    const errorStr = filterArgs(args);
    if (ignorePatterns.some(pat => errorStr.toLowerCase().includes(pat.toLowerCase()))) {
      return;
    }
    originalConsoleWarn(...args);
  };

  window.addEventListener('error', (event) => {
    const errorMsg = event.message || (event.error && event.error.message) || String(event);
    if (ignorePatterns.some(pat => errorMsg.toLowerCase().includes(pat.toLowerCase()))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    let errorMsg = '';
    if (typeof reason === 'string') {
      errorMsg = reason;
    } else if (reason && typeof reason === 'object') {
      errorMsg = (reason.message || '') + ' ' + (reason.stack || '') + ' ' + JSON.stringify(reason);
    } else {
      errorMsg = String(reason || '');
    }

    if (ignorePatterns.some(pat => errorMsg.toLowerCase().includes(pat.toLowerCase()))) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
  }, true);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

