import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: [
      // Funções de borda importam pelo especificador do Deno ("npm:…"); nos testes apontam para stubs.
      { find: /^npm:@supabase\/supabase-js@2\/cors$/, replacement: path.resolve(__dirname, "./src/test/stubs/cors.ts") },
      { find: /^npm:@supabase\/supabase-js@2$/, replacement: path.resolve(__dirname, "./src/test/stubs/supabaseJs.ts") },
      { find: "@", replacement: path.resolve(__dirname, "./src") },
    ],
  },
});
