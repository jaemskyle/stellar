// @ts-check
import { defineConfig, envField } from "astro/config";

import react from "@astrojs/react";

import tailwind from "@astrojs/tailwind";

import vercel from "@astrojs/vercel/serverless";

// import clerk from "@clerk/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [
    // clerk(),
    react(),
    tailwind({
      applyBaseStyles: false,
    }),
  ],
  output: "server",
  adapter: vercel(),
  vite: {
    define: {
      "process.env.OPENAI_API_KEY": JSON.stringify(process.env.OPENAI_API_KEY),
    },
  },
});
