import OpenAI from "openai";

const SUPPORTED_FORMATS = [
  "flac",
  "m4a",
  "mp3",
  "mp4",
  "mpeg",
  "mpga",
  "oga",
  "ogg",
  "wav",
  "webm",
];

interface AudioFile {
  type: string;
  // other properties...
}

export const POST = async (request: Request) => {
  const openai = new OpenAI({
    apiKey: import.meta.env.OPENAI_API_KEY,
  });

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as AudioFile;

    if (!audioFile) {
      return new Response(JSON.stringify({ error: "No audio file provided" }), {
        status: 400,
      });
    }

    // Check if the file is actually a File/Blob object
    if (
      typeof audioFile !== "object" ||
      !(audioFile instanceof File || audioFile instanceof Blob)
    ) {
      return new Response(
        JSON.stringify({
          error: "Invalid file format. Expected a File or Blob",
        }),
        { status: 400 },
      );
    }

    // Get file extension from filename or type
    const fileExtension =
      audioFile instanceof File
        ? audioFile.name.split(".").pop()?.toLowerCase()
        : audioFile.type.split("/").pop()?.toLowerCase();

    // Validate file format
    if (!fileExtension || !SUPPORTED_FORMATS.includes(fileExtension)) {
      return new Response(
        JSON.stringify({
          error: `Invalid file format. Supported formats: ${SUPPORTED_FORMATS.join(", ")}`,
          receivedFormat: fileExtension || "unknown",
        }),
        { status: 400 },
      );
    }

    // Create a File object if we received a Blob
    const file =
      audioFile instanceof File
        ? audioFile
        : new File([audioFile], `audio.${fileExtension}`, {
            type: audioFile.type,
          });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
    });

    return new Response(JSON.stringify({ text: transcription.text }), {
      status: 200,
    });
  } catch (error) {
    console.error("Transcription error:", error);

    // More specific error handling
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 413
    ) {
      return new Response(JSON.stringify({ error: "File size too large" }), {
        status: 413,
      });
    }

    return new Response(
      JSON.stringify({
        error: "Failed to transcribe audio",
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500 },
    );
  }
};
