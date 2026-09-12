import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { marketingSeoPlugin } from './vite-plugin-marketing-seo';

export default defineConfig({
  plugins: [react(), marketingSeoPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    port: 5173,
  },
  preview: {
    port: 5173,
  },
});
