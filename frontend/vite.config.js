import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",

      includeAssets: [
        "favicon.svg",
        "logo-dark.svg",
        "icon-192.png",
        "icon-512.png",
        "icon-1024.png",
        "dashboard.png"
      ],

      manifest: false
    })
  ]
});