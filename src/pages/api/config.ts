import { defineConfig } from "astro/config";

export async function GET() {
  return new Response(
    JSON.stringify({
      apiKey: process.env.OPENAI_API_KEY,
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}
