from fastapi import APIRouter, Depends, UploadFile, File, status, Body
from fastapi.responses import StreamingResponse
from app.core.dependencies import get_current_user
from app.models.user import User
from app.voice.voice_service import VoiceService

router = APIRouter()


@router.post("/stt", status_code=status.HTTP_200_OK)
async def speech_to_text(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Transcribes an uploaded voice audio file using Gemini 2.5 Flash."""
    audio_content = await file.read()
    mime_type = file.content_type or "audio/wav"
    
    # Run speech to text
    transcription = VoiceService.speech_to_text(audio_content, mime_type=mime_type)
    return {"text": transcription}


@router.post("/tts", status_code=status.HTTP_200_OK)
def text_to_speech(
    text: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user)
):
    """Converts clinical text response to speech MP3 audio stream."""
    audio_fp = VoiceService.text_to_speech(text)
    return StreamingResponse(
        audio_fp,
        media_type="audio/mpeg",
        headers={
            "Content-Disposition": "attachment; filename=speech.mp3"
        }
    )
