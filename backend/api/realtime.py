"""
TacoTutor Backend - WebSocket endpoint for live tutoring.
Uses Gemini text generation over WebSocket and lets the browser speak replies.
"""

import json
import os
import tempfile
import subprocess
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from google import genai
from google.genai import types

from backend.core.config import settings
from backend.core.database import SessionLocal
from backend.models import Lesson
from backend.services.tutor_engine import TutorEngine, SessionState
from tutor.prompts import get_system_prompt
from tutor.curriculum.lessons import get_curriculum
from tutor.stt.providers import get_stt

router = APIRouter(tags=["realtime"])

# Initialize Tutor Engine
engine = TutorEngine()

MODEL = os.environ.get("GEMINI_TEXT_MODEL", "gemini-2.5-flash")
TTS_DIR = Path("/tmp/tacotutor_tts")
TTS_DIR.mkdir(exist_ok=True)


def _build_system_prompt(subject: str, lesson_level: int | None = None, lesson_content: dict | None = None) -> str:
    """Build a system prompt for the given subject and selected lesson when available."""
    curriculum = get_curriculum(subject)
    level_key = lesson_level if lesson_level in curriculum else next(iter(curriculum.keys()))
    level_data = curriculum[level_key]
    lesson = lesson_content or level_data["lessons"][0]
    return get_system_prompt(subject, level_data, lesson, grade=1)


def _load_lesson_context(lesson_id: str | None) -> dict | None:
    if not lesson_id:
        return None

    db = SessionLocal()
    try:
        lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
        if not lesson:
            return None
        return {
            "id": str(lesson.id),
            "title": lesson.title,
            "subject": lesson.subject,
            "level": lesson.level,
            "content": lesson.content or {},
        }
    finally:
        db.close()


def _build_lesson_prompt(child_name: str, lesson_context: dict | None, ayah_index: int = 0, include_greeting: bool = False) -> str:
    if lesson_context and lesson_context["content"].get("ayahs"):
        ayahs = lesson_context["content"]["ayahs"]
        ayah_index = max(0, min(ayah_index, len(ayahs) - 1))
        surah_name = lesson_context["content"].get("surah") or lesson_context["title"]
        ayah_text = ayahs[ayah_index]
        ayah_number = ayah_index + 1
        if include_greeting:
            return (
                f"The child's name is {child_name}. The selected lesson is {lesson_context['title']}. "
                f"Greet {child_name} warmly in one short, kid-friendly sentence, then ask {child_name} to read only ayah {ayah_number} from Surah {surah_name}. "
                f"Quote this exact ayah verbatim and do not shorten it: {ayah_text}. "
                "Reply in simple Arabic only. Do not use English. Do not break it into smaller chunks. Keep it encouraging, simple, and concise."
            )
        return (
            f"The child's name is {child_name}. The selected lesson is {lesson_context['title']}. "
            f"Now continue with ayah {ayah_number} from Surah {surah_name}. "
            f"In one short, kid-friendly sentence, guide {child_name} to read this exact ayah only, quoted verbatim with no shortening: {ayah_text}. "
            "Reply in simple Arabic only. Do not use English. Do not greet again. Do not break it into smaller chunks. Keep it encouraging, simple, and concise."
        )

    if lesson_context and lesson_context["content"].get("letter"):
        letter_name = lesson_context["content"].get("name") or lesson_context["title"]
        letter = lesson_context["content"].get("letter")
        if include_greeting:
            return (
                f"The child's name is {child_name}. The selected lesson is {lesson_context['title']}. "
                f"Greet {child_name} warmly in one short, kid-friendly sentence, then introduce the Arabic letter {letter_name} ({letter}) and ask for one repeat only. "
                "Reply in simple Arabic only. Do not use English. Keep it encouraging, simple, and concise."
            )
        return (
            f"The child's name is {child_name}. Continue the selected lesson {lesson_context['title']}. "
            f"In one short, kid-friendly sentence, ask {child_name} to repeat the Arabic letter {letter_name} ({letter}) one time. "
            "Reply in simple Arabic only. Do not use English. Do not greet again. Keep it encouraging, simple, and concise."
        )

    if include_greeting:
        return (
            f"The child's name is {child_name}. Greet {child_name} warmly in one short, kid-friendly sentence, "
            "then immediately invite them to begin the first reading step of today's lesson. "
            "Keep it encouraging, simple, and concise."
        )
    return (
        f"The child's name is {child_name}. In one short, kid-friendly sentence, guide {child_name} to continue the current lesson. "
        "Do not greet again. Keep it encouraging, simple, and concise."
    )


@router.websocket("/ws")
async def realtime_ws(websocket: WebSocket):
    await websocket.accept()

    session_id = websocket.query_params.get("session")
    subject = websocket.query_params.get("subject", "quran")
    child_id = websocket.query_params.get("childId", "student")

    print(f"[REALTIME] New connection: session={session_id}, child={child_id}, subject={subject}")

    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    active_subject = subject
    active_system_prompt = _build_system_prompt(subject)
    active_child_name = "friend"
    active_lesson_context = None
    current_ayah_index = 0

    async def generate_reply(user_text: str, system_prompt_text: str | None = None) -> str:
        response = await client.aio.models.generate_content(
            model=MODEL,
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt_text or active_system_prompt,
                temperature=0.7,
            ),
        )
        return (response.text or "").strip()

    await websocket.send_json({
        "type": "session_state",
        "sessionId": session_id,
        "status": "connected",
    })

    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")

            if msg_type == "session_start":
                active_child_name = (msg.get("childName") or "friend").strip() or "friend"
                active_lesson_context = _load_lesson_context(msg.get("lessonId"))
                current_ayah_index = 0

                if active_lesson_context:
                    active_subject = active_lesson_context["subject"]
                    active_system_prompt = _build_system_prompt(
                        active_subject,
                        lesson_level=active_lesson_context.get("level"),
                        lesson_content=active_lesson_context.get("content"),
                    )

                opening_prompt = _build_lesson_prompt(
                    active_child_name,
                    active_lesson_context,
                    ayah_index=current_ayah_index,
                    include_greeting=True,
                )
                reply = await generate_reply(opening_prompt, active_system_prompt)
                await websocket.send_json({
                    "type": "assistant_sentence",
                    "text": reply,
                    "ayahIndex": current_ayah_index,
                })
                await websocket.send_json({"type": "turn_complete"})

            elif msg_type == "set_ayah":
                ayahs = (active_lesson_context or {}).get("content", {}).get("ayahs") or []
                if not ayahs:
                    continue

                requested_index = int(msg.get("ayahIndex", 0))
                current_ayah_index = max(0, min(requested_index, len(ayahs) - 1))
                ayah_prompt = _build_lesson_prompt(
                    active_child_name,
                    active_lesson_context,
                    ayah_index=current_ayah_index,
                    include_greeting=False,
                )
                reply = await generate_reply(ayah_prompt, active_system_prompt)
                await websocket.send_json({
                    "type": "assistant_sentence",
                    "text": reply,
                    "ayahIndex": current_ayah_index,
                })
                await websocket.send_json({"type": "turn_complete"})

            elif msg_type == "text":
                user_text = msg.get("data", "")
                ayahs = (active_lesson_context or {}).get("content", {}).get("ayahs") or []
                if ayahs:
                    target_ayah = ayahs[max(0, min(current_ayah_index, len(ayahs) - 1))]
                    user_text = (
                        f"Current target ayah: {target_ayah}. "
                        f"The child said: {msg.get('data', '')}. "
                        "In one short, kid-friendly sentence, briefly assess the attempt and give the next tiny step for this same ayah. "
                        "Reply in simple Arabic only. Do not use English."
                    )
                elif active_subject == "quran":
                    user_text = (
                        f"The child said: {msg.get('data', '')}. "
                        "In one short, kid-friendly sentence, briefly assess the attempt and give the next tiny step. "
                        "Reply in simple Arabic only. Do not use English."
                    )
                reply = await generate_reply(user_text)
                await websocket.send_json({"type": "assistant_sentence", "text": reply, "ayahIndex": current_ayah_index})
                await websocket.send_json({"type": "turn_complete"})

            elif msg_type == "audio":
                await websocket.send_json({
                    "type": "error",
                    "message": "Live microphone streaming is not wired yet. Use text for now.",
                })

            elif msg_type == "barge_in":
                await websocket.send_json({"type": "turn_complete", "reason": "barge_in"})

            elif msg_type == "session_end":
                break

    except WebSocketDisconnect:
        print(f"[REALTIME] Client disconnected: {session_id}")
    except Exception as e:
        print(f"[REALTIME] Error: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    language: str = Form("auto")
):
    """Transcribe uploaded audio file."""
    suffix = Path(audio.filename).suffix or ".webm"
    with tempfile.TemporaryDirectory(prefix="tacotutor-stt-") as tmpdir:
        source_path = Path(tmpdir) / f"input{suffix}"
        wav_path = Path(tmpdir) / "input.wav"
        
        with open(source_path, "wb") as f:
            shutil_copyfileobj(audio.file, f)

        if suffix.lower() == ".wav":
            wav_path = source_path
        else:
            try:
                subprocess.run(
                    [
                        "ffmpeg", "-y",
                        "-i", str(source_path),
                        "-ac", "1",
                        "-ar", "16000",
                        str(wav_path),
                    ],
                    check=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.PIPE,
                )
            except subprocess.CalledProcessError as exc:
                error_text = exc.stderr.decode("utf-8", errors="ignore")[-400:]
                raise HTTPException(status_code=500, detail=f"Audio conversion failed: {error_text}")

        try:
            stt = get_stt()
            text = await stt.transcribe(str(wav_path), language=language)
            return {"text": (text or "").strip()}
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))


@router.get("/audio/{audio_name}")
async def get_audio(audio_name: str):
    """Retrieve generated TTS audio file."""
    path = TTS_DIR / audio_name
    if not path.exists() and "." not in audio_name:
        matches = sorted(TTS_DIR.glob(f"{audio_name}.*"))
        if matches:
            path = matches[0]
            
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")
        
    return FileResponse(path)


def shutil_copyfileobj(fsrc, fdst, length=16*1024):
    """Helper to copy file-like objects."""
    import shutil
    shutil.copyfileobj(fsrc, fdst, length)
