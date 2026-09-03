import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const root=fileURLToPath(new URL('.',import.meta.url))

export default defineConfig({
  plugins: [react()],
  test: { pool: 'threads', maxWorkers: 1 },
  build:{rollupOptions:{input:{main:resolve(root,'index.html'),ko:resolve(root,'ko/index.html'),en:resolve(root,'en/index.html'),zh:resolve(root,'zh/index.html'),vi:resolve(root,'vi/index.html'),mn:resolve(root,'mn/index.html'),ja:resolve(root,'ja/index.html')}}},
})
