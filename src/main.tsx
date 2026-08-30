import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import MissingConfigScreen from './components/MissingConfigScreen';
import { PrivacyModeProvider } from '@/hooks/usePrivacyMode';
import { isSupabaseConfigured } from './lib/supabase/client';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {isSupabaseConfigured ? (
        <PrivacyModeProvider>
          <App />
        </PrivacyModeProvider>
      ) : <MissingConfigScreen />}
    </ErrorBoundary>
  </StrictMode>,
);
