// src/pages/api/text-to-speech.ts

import OpenAI from "openai";

export const POST = async (request: Request) => {
  const openai = new OpenAI({
    apiKey: import.meta.env.OPENAI_API_KEY,
  });

  try {
    const { text } = await request.json();

    const speechResponse = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });

    // Convert the audio stream to blob
    const audioBuffer = await speechResponse.arrayBuffer();

    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to convert text to speech" }),
      {
        status: 500,
      },
    );
  }
};
