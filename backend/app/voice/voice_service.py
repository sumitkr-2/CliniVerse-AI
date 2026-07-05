import io
import logging
from gtts import gTTS
from google.genai import types
from app.services.gemini_service import GeminiService

logger = logging.getLogger("app.voice_service")


class VoiceService:
    @staticmethod
    def text_to_speech(text: str, lang: str = "en") -> io.BytesIO:
        """Converts text to speech audio bytes using gTTS."""
        try:
            logger.info("Generating text-to-speech audio...")
            tts = gTTS(text=text, lang=lang)
            fp = io.BytesIO()
            tts.write_to_fp(fp)
            fp.seek(0)
            return fp
        except Exception as e:
            logger.error(f"Text-to-speech conversion failed: {e}")
            raise e

    @staticmethod
    def speech_to_text(audio_bytes: bytes, mime_type: str = "audio/wav") -> str:
        """Transcribes audio data using Gemini 2.5 Flash's multimodal capacity."""
        try:
            logger.info(f"Transcribing audio stream of type {mime_type}...")
            client = GeminiService.get_client()
            
            # Using new Google GenAI SDK syntax to transcribe audio
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    types.Part.from_bytes(
                        data=audio_bytes,
                        mime_type=mime_type
                    ),
                    "Transcribe the spoken audio text content accurately. Return only the transcription."
                ]
            )
            transcription = response.text or ""
            return transcription.strip()
        except Exception as e:
            logger.error(f"Speech-to-text transcription failed: {e}")
            raise e
