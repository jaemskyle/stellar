import { useState, useRef, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";

const VoiceChat = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const processAudioAndGetResponse = async (audioData: Blob[]) => {
    setIsProcessing(true);

    try {
      // Create audio blob with mp3 mime type
      const recordedAudioBlob = new Blob(audioData, { type: "audio/mp3" });

      // Convert the blob to a File object with a proper name and extension
      const audioFile = new File([recordedAudioBlob], "recording.mp3", {
        type: "audio/mp3",
      });

      // Create form data with audio file
      const formData = new FormData();
      formData.append("audio", audioFile);

      // First, convert audio to text using Whisper API
      const whisperResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!whisperResponse.ok) {
        const errorData = await whisperResponse.json();
        throw new Error(errorData.error || "Failed to transcribe audio");
      }

      const { text } = await whisperResponse.json();

      // Then, get ChatGPT response
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!chatResponse.ok) throw new Error("Failed to get response");

      const { response: chatGPTResponse } = await chatResponse.json();
      setResponse(chatGPTResponse);

      // Optional: Convert response to speech using Text-to-Speech
      const speechResponse = await fetch("/api/text-to-speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: chatGPTResponse }),
      });

      if (!speechResponse.ok) throw new Error("Failed to convert to speech");

      const responseAudioBlob = await speechResponse.blob();
      const audioUrl = URL.createObjectURL(responseAudioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while processing your message. Please try again.",
      );
      console.error("Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    // Request microphone permissions when component mounts
    const initializeMediaRecorder = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        // Specify audio options for MP3 format
        const options = {
          mimeType: "audio/webm;codecs=opus", // We'll convert this to MP3 later
          audioBitsPerSecond: 128000,
        };

        mediaRecorder.current = new MediaRecorder(stream, options);

        mediaRecorder.current.ondataavailable = (event: any) => {
          if (event.data.size > 0) {
            audioChunks.current.push(event.data);
          }
        };

        mediaRecorder.current.onstop = async () => {
          const currentChunks = [...audioChunks.current];
          audioChunks.current = []; // Clear the chunks for next recording

          try {
            // Convert webm to mp3 using audio context
            const webmBlob = new Blob(currentChunks, { type: "audio/webm" });
            const arrayBuffer = await webmBlob.arrayBuffer();
            const audioContext = new AudioContext();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            // Create an offline context for rendering
            const offlineContext = new OfflineAudioContext(
              audioBuffer.numberOfChannels,
              audioBuffer.length,
              audioBuffer.sampleRate,
            );

            const source = offlineContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineContext.destination);
            source.start();

            // Render audio
            const renderedBuffer = await offlineContext.startRendering();

            // Convert to WAV format (widely supported)
            const wavBlob = await new Promise<Blob>((resolve) => {
              const length = renderedBuffer.length;
              const wav = new Float32Array(length);
              renderedBuffer.copyFromChannel(wav, 0);

              resolve(new Blob([wav], { type: "audio/wav" }));
            });

            processAudioAndGetResponse([wavBlob]);
          } catch (err) {
            setError("Failed to process audio. Please try again.");
            console.error("Audio processing error:", err);
          }
        };
      } catch (err) {
        setError(
          "Microphone access denied. Please enable microphone permissions.",
        );
        console.error("Microphone error:", err);
      }
    };

    initializeMediaRecorder();

    // Cleanup function
    return () => {
      if (
        mediaRecorder.current &&
        mediaRecorder.current.state === "recording"
      ) {
        mediaRecorder.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "inactive") {
      setIsRecording(true);
      setError(null);
      setResponse(null);
      audioChunks.current = []; // Clear any previous chunks
      mediaRecorder.current.start();
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      setIsRecording(false);
      mediaRecorder.current.stop();
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4 space-y-4">
      <div className="flex justify-center">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          className={`rounded-full p-4 ${
            isRecording
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isRecording ? (
            <MicOff className="h-6 w-6" />
          ) : (
            <Mic className="h-6 w-6" />
          )}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {response && (
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-gray-800">{response}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceChat;
