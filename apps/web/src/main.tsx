import './app.css';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { applyCspNonce } from './csp-nonce.ts';
import { I18nProvider } from './i18n/i18n-provider.tsx';
import { detectLocale } from './i18n/translate.ts';
import { createAppRouter } from './router.tsx';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

applyCspNonce();
const router = createAppRouter();

createRoot(container).render(
  <StrictMode>
    <I18nProvider locale={detectLocale(navigator.languages)}>
      <RouterProvider router={router} />
    </I18nProvider>
  </StrictMode>,
);
