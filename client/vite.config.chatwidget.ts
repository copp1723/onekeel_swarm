import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Vite config for building the standalone chat widget bundle
export default defineConfig({
  plugins: [react()],
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/components/chat-widget/ChatWidgetStandalone.tsx'),
      name: 'CCLChatWidget',
      fileName: 'chat-widget.bundle',
      formats: ['iife']
    },
    rollupOptions: {
      // Ensure React is included in the bundle
      external: [],
      output: {
        // Global variables for IIFE build
        globals: {},
        // Inline all assets
        assetFileNames: 'chat-widget.[ext]',
        // Single file output
        inlineDynamicImports: true
      }
    },
    // Output to public directory
    outDir: 'public',
    emptyOutDir: false,
    // Inline CSS
    cssCodeSplit: false
  }
});