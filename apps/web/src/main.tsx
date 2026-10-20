import './app.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createAppRouter } from './router.tsx';
import { createQueryClient } from './shared/api/query.client.ts';
import { I18nProvider } from './shared/i18n/i18n-provider.tsx';
import { detectLocale } from './shared/i18n/translate.util.ts';
import { applyCspNonce } from './shared/security/csp-nonce.util.ts';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

applyCspNonce();
const queryClient = createQueryClient();
const router = createAppRouter({ queryClient });

createRoot(container).render(
  <StrictMode>
    <I18nProvider locale={detectLocale(navigator.languages)}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
);
