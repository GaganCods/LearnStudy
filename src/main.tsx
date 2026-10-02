import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PomodoroProvider } from './components/PomodoroContext.tsx';
import { ToastProvider } from './components/ToastContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AuthProvider>
        <PomodoroProvider>
          <App />
        </PomodoroProvider>
      </AuthProvider>
    </ToastProvider>
  </StrictMode>,
);
