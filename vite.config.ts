import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return;
          if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
          if (id.includes('react-router')) return 'router';
          if (id.includes('@supabase')) return 'supabase';
          if (id.includes('axios') || id.includes('jspdf') || id.includes('html2canvas') || id.includes('dompurify')) return 'libs';
          return 'vendor';
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
