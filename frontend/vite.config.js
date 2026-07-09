import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "icon-192.png",
        "icon-512.png"
      ],

      manifest: {
        short_name: "AegisData",
        name: "AegisData",
        description:
          "An autonomous AI data analyst that analyzes CSV and Excel files.",

        start_url: "/",
        scope: "/",

        display: "standalone",

        background_color: "#0F172A",
        theme_color: "#4F46E5",

        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png"
          }
        ]
      }
    })
  ]
});