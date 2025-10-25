import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const isStreamMode = process.env.VITE_STREAM_MODE === 'true';
  
  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          main: isStreamMode ? './src/main-stream.tsx' : './src/main.tsx',
        },
      },
    },
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  };
});