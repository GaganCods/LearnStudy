import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { PomodoroProvider } from './components/PomodoroContext.tsx';
import { ToastProvider } from './components/ToastContext.tsx';
import { AuthProvider } from './context/AuthContext.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary fallbackTitle="LearnStudy Application">
      <ToastProvider>
        <AuthProvider>
          <PomodoroProvider>
            <App />
          </PomodoroProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>,
);

