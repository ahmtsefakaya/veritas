import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/*
  VITE_PROXY_TARGET verilirse `/api` yolu o adrese vekillenir.

  Canli backend'in CORS listesi yalnizca Vercel kokenini kabul ediyor (dogru
  davranis). Yerel onizlemede ayni kokenden konusabilmek icin gelistirme
  sunucusu vekil olarak kullanilir; uretim yapisinda bu kod yoluna girilmez.
*/
const proxyTarget = process.env.VITE_PROXY_TARGET

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: proxyTarget
    ? {
        proxy: {
          '/api': {
            target: proxyTarget,
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/api/, ''),
          },
        },
      }
    : undefined,
})
