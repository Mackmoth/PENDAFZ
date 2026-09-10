import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

// Browser bundles can't read process.env, so mirror the plain server-side
// variables into import.meta.env. This lets a single set of environment
// variables (SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY) work on both server
// and client, with no VITE_ prefix duplication required at build time.
const supabaseUrl =
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "";

export default defineConfig({
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [tanstackStart({ server: { entry: "server" } }), react(), tailwindcss()],
});
