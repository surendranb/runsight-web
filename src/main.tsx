import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SecureApp from './SecureApp.tsx';
import TestApp from './App.test.tsx';
import './index.css';

// Always use SecureApp in production (no environment variables needed in frontend)
// Only use TestApp for local development testing
const useTestMode = import.meta.env.DEV && import.meta.env.VITE_USE_TEST_MODE === 'true';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {useTestMode ? <TestApp /> : <SecureApp />}
  </StrictMode>
);
