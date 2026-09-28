import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'
import autoprefixer from 'autoprefixer';
// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve:{dedupe:['react','react-dom','jotai']},
  optimizeDeps:{exclude:['mb-fs2']},
  css: {postcss:{plugins:[autoprefixer(),],},},
})
