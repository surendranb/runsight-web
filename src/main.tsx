import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import TestApp from './App.test.tsx';
import './index.css';

// Use TestApp if environment variables are not set
const useTestMode = !import.meta.env.VITE_STRAVA_CLIENT_ID || 
                   !import.meta.env.VITE_SUPABASE_URL;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {useTestMode ? <TestApp /> : <App />}
  </StrictMode>
);
