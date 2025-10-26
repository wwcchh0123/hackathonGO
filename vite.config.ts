import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // 允许访问项目根目录下的 .playwright-mcp 目录
  server: {
    fs: {
      allow: [
        '..',  // 允许访问父目录
        '.playwright-mcp',  // 允许访问截图目录
      ],
    },
  },
});
