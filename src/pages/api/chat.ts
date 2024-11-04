// src/pages/api/chat.ts
import OpenAI from "openai";

export const POST = async (request: Request) => {
  const openai = new OpenAI({
    apiKey: import.meta.env.OPENAI_API_KEY,
  });

  try {
    const { message } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: message }],
    });

    return new Response(
      JSON.stringify({ response: completion.choices[0].message.content }),
      { status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to get chat response" }),
      {
        status: 500,
      },
    );
  }
};
