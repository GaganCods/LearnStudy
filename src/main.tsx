import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PomodoroProvider } from './components/PomodoroContext.tsx';
import { ToastProvider } from './components/ToastContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <PomodoroProvider>
        <App />
      </PomodoroProvider>
    </ToastProvider>
  </StrictMode>,
);
