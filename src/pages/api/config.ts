/* src/pages/api/config.ts */
import { defineConfig } from 'astro/config';

export async function GET() {
  console.log('Fetching API key from environment variables');
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('API key:', apiKey);

  return new Response(
    JSON.stringify({
      apiKey: apiKey,
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
