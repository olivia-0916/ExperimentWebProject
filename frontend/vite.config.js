// /frontend/vite.config.js (新增代理配置)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 🚀 關鍵修正：設定代理
    proxy: {
      // 當前端請求以 '/api' 開頭時
      '/api': {
        // 將請求導向後端伺服器
        target: 'http://localhost:3001', 
        // 允許跨域請求
        changeOrigin: true,
        // 不重寫路徑 (即保持 /api/submit_pretest)
        // rewrite: (path) => path.replace(/^\/api/, ''), // 我們不需要重寫，因為後端已經有 /api
      },
    },
    // 確保前端開發伺服器端口是 5173 (如果預設不是的話)
    // port: 5173, 
  },
});