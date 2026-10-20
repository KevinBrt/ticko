/**
 * Docker HEALTHCHECK probe. The runtime image has no shell or curl, so this tiny script
 * queries `/health` with Node and exits 0 (healthy) or 1 (unhealthy).
 */
import { loadConfig } from './config.ts';

const TIMEOUT_MS = 4000;

const { host, port } = loadConfig(process.env);
const probeHost = host === '0.0.0.0' || host === '::' ? '127.0.0.1' : host;
const authority = probeHost.includes(':') ? `[${probeHost}]` : probeHost;

try {
  const response = await fetch(`http://${authority}:${port}/health`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  process.exit(response.ok ? 0 : 1);
} catch {
  process.exit(1);
}
