import {defineConfig} from "vite";
import {resolve, relative, extname} from 'path';
import {fileURLToPath} from 'url';
import {glob} from 'glob';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
//@ts-expect-error
import libInjectCss from 'vite-plugin-lib-inject-css';
export default defineConfig({
  plugins: [react(), libInjectCss(), dts({include: ['lib']})],
  build: {
    lib: {entry: resolve(__dirname, 'lib/main.ts')},
    rollupOptions: {
      external: ['react', 'react/jsx-runtime'],
      input: Object.fromEntries(
        glob
          .sync('lib/**/*.{ts,tsx}', {ignore: ['lib/**/*.d.ts', 'lib/**/*.stories.tsx']})
          .map(file=>[
            relative('lib', file.slice(0, file.length-extname(file).length)),
            fileURLToPath(new URL(file, import.meta.url)),
          ]),
      ),
      output: {
        format: 'es',
        assetFileNames: 'assets/[name][extname]',
        entryFileNames: '[name].js',
      },
    },
  },
});