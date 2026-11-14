import { bindings, defineConfig } from 'cf/config';
import * as entrypoint from './worker.mjs' with { type: 'cf-worker' };
export default defineConfig({
  accountId: '4b47db42a7b2a16e267f5d80aecfaa60',
  worker: {
    name: 'monaro-landing',
    domains: ['getmonaro.app'],
    entrypoint,
    compatibilityDate: '2026-11-13',
    observability: { enabled: true },
    assets: { runWorkerFirst: ['/api/*','/privacy*','/terms*','/data-deletion*'] },
    env: { ASSETS: bindings.assets(), WAITLIST: bindings.d1({ name: 'monaro-waitlist', id: 'e965b291-1214-4a72-8e77-919336eabcb3' }) },
  },
});
