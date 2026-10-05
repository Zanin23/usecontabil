import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Modo "preview de interface" (`UC_PREVIEW=1 npm run dev`): troca o cliente do
 * backend por um simulado que guarda tudo no navegador, permitindo abrir a
 * interface sem login e sem tocar na base real. Não afeta build nem testes.
 */
const preview = process.env.UC_PREVIEW === "1";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), tailwindcss(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      ...(preview
        ? [
            {
              find: "@/integrations/supabase/client",
              replacement: path.resolve(__dirname, "./src/preview/supabaseLocal.ts"),
            },
          ]
        : []),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
          "radix-vendor": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
          ],
        },
      },
    },
  },
}));
