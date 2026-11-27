import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'neutral',
  dts: true,
  clean: true,
  css: {
    fileName:'defaultWinStyles.css',
  },
  deps: {
    neverBundle: ['react', 'framer-motion', 'react-rnd', 'zod', 'react-dom', 'react/jsx-runtime', 'jotai', /^jotai\//],
    dts: {
      neverBundle: ["zod"],
    },
  },
});