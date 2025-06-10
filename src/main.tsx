import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import SecureApp from './SecureApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SecureApp />
  </StrictMode>
);
