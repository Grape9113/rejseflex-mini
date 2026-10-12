import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
const base = '/rejseflex-mini/'
export default defineConfig({base,plugins:[react(),VitePWA({registerType:'autoUpdate',includeAssets:['icon-192.png','icon-512.png'],manifest:{id:base,name:'RejseFlex Mini',short_name:'RejseFlex',description:'Dine rejser, togtider og dokumenter samlet på din enhed.',lang:'da',start_url:base,scope:base,display:'standalone',theme_color:'#285b49',background_color:'#f5f7f4',icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},workbox:{globPatterns:['**/*.{js,css,html,png,svg,ico,webmanifest}'],navigateFallback:'index.html'}})]})
