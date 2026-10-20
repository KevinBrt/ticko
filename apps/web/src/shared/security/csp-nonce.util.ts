import { setNonce } from 'get-nonce';

/**
 * Some components (Radix scroll lock) inject `<style>` tags at runtime. The strict CSP only
 * accepts them with the per-request nonce the server wrote into `<meta property="csp-nonce">`.
 */
export function applyCspNonce(): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[property="csp-nonce"]');
  if (meta?.nonce) {
    setNonce(meta.nonce);
  }
}
