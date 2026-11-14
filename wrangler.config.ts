import { defineWranglerConfig } from 'wrangler/experimental-config';
export default defineWranglerConfig({
  assetsDirectory: './public',
  build: { command: 'node prepare-assets.mjs' },
  dev: { port: 5180 },
  sendMetrics: false,
});
