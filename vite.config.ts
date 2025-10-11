import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import packageJson from './package.json';

export default defineConfig({
  plugins: [react()],
  root: './src/renderer',
  base: '',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  build: {
    outDir: '../../dist/renderer',
    emptyOutDir: true,
    sourcemap: true, // 🔥 確保 source map 生成
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
    },
  },
  server: {
    port: 3000,
    host: '127.0.0.1',
  },
});