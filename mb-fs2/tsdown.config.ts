// tsdown.config.ts
import { defineConfig } from 'tsdown'
export default defineConfig({
  entry:'src/index.ts',
  format:'esm',dts:true,
  external:['react','react-dom','react/jsx-runtime','jotai'],
});