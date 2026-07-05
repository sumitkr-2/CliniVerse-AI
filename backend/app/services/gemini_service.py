import logging
from typing import Generator, Optional
from google import genai
from google.genai import types
from app.core.config import settings

logger = logging.getLogger("app.gemini")


class GeminiService:
    _client: Optional[genai.Client] = None

    @classmethod
    def get_client(cls) -> genai.Client:
        """Initializes and returns Google GenAI client using settings api key."""
        if cls._client is None:
            api_key = getattr(settings, "GEMINI_API_KEY", None)
            if not api_key:
                # Under official genai SDK, it can also pick up GEMINI_API_KEY environment var automatically
                cls._client = genai.Client()
            else:
                cls._client = genai.Client(api_key=api_key)
        return cls._client

    @classmethod
    def generate_content(cls, prompt: str) -> str:
        """Helper to generate text response synchronously."""
        try:
            client = cls.get_client()
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=prompt
            )
            return response.text or ""
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            raise e

    @classmethod
    def generate_content_stream(cls, prompt: str) -> Generator[str, None, None]:
        """Generates content stream token-by-token using Gemini 2.5 Flash."""
        try:
            client = cls.get_client()
            response = client.models.generate_content_stream(
                model="gemini-2.5-flash",
                contents=prompt
            )
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.error(f"Gemini streaming error: {e}")
            yield f"\n\n⚠️ Error during content generation: {str(e)}"
