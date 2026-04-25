import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // 백엔드 CORS 미설정 시 사용 가능 (현재는 백엔드 CORS로 처리하므로 주석)
    // proxy: { '/api': 'http://localhost:8000' },
  },
})
