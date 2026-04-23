"""
TacoTutor Backend - WebSocket endpoint for live tutoring.
Uses Hugging Face chat completion for tutor replies and lets the browser speak them.
"""

import json
import os
import tempfile
import subprocess
import httpx
from pathlib import Path

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse

from backend.core.database import SessionLocal
from backend.models import Lesson
from backend.services.tutor_engine import TutorEngine
from tutor.openclaw import OpenClawMemory, compose_openclaw_prompt, load_openclaw_skill
from tutor.prompts import get_system_prompt
from tutor.curriculum.lessons import get_curriculum
from tutor.secrets import get_hf_api_key, get_secret
from tutor.stt.providers import get_stt

router = APIRouter(tags=["realtime"])

# Initialize Tutor Engine
engine = TutorEngine()

MODEL = os.environ.get("HUGGINGFACE_TEXT_MODEL", "Qwen/Qwen2.5-7B-Instruct:fastest")
TTS_DIR = Path("/tmp/tacotutor_tts")
TTS_DIR.mkdir(exist_ok=True)

# Arabic voices for edge-tts (priority order)
ARABIC_VOICES = ["ar-SA-HamedNeural", "ar-SA-ZariNeural", "ar-EG-SalmaNeural", "ar-AE-FatimaNeural"]


def _generate_tts(text: str, is_arabic: bool = False) -> str | None:
    """Generate TTS audio using edge-tts. Returns filename or None."""
    import hashlib
    if not text.strip():
        return None
    h = hashlib.md5(text.encode()).hexdigest()[:12]
    filename = f"tts_{h}.mp3"
    filepath = TTS_DIR / filename
    if filepath.exists():
        return filename
    voice = ARABIC_VOICES[0] if is_arabic else "en-US-DavisNeural"
    try:
        subprocess.run(
            ["edge-tts", "--text", text[:500], "--voice", voice, "--write-media", str(filepath)],
            capture_output=True, timeout=15,
        )
        if filepath.exists() and filepath.stat().st_size > 100:
            return filename
    except Exception as e:
        print(f"[TTS] edge-tts failed: {e}")
    return None
OPENCLAW_SKILL_TEXT = load_openclaw_skill()
OPENCLAW_MEMORY = OpenClawMemory()


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

    import uuid as _uuid
    try:
        lesson_uuid = _uuid.UUID(lesson_id)
    except ValueError:
        return None

    db = SessionLocal()
    try:
        lesson = db.query(Lesson).filter(Lesson.id == lesson_uuid).first()
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
        total_ayahs = len(ayahs)

        # Build context about position in surah
        position_info = f"هذه الآية رقم {ayah_number} من {total_ayahs} آيات في سورة {surah_name}."

        if include_greeting:
            return (
                f"أنت معلم قرآن لطفلة اسمها {child_name}. الدرس اليوم هو سورة {surah_name}. "
                f"{position_info} "
                f"سلّم على {child_name} بحرارة، ثم اشرح لها أنكم ستتعلمون سورة {surah_name} معاً. "
                f"ثم اطلب منها أن تقرأ الآية {ayah_number} وهي: {ayah_text}. "
                "اكتب ردك بالعربية الفصحى فقط. لا تستخدم الإنجليزية أبداً. "
                "كن مشجعاً ولطيفاً. اذكر الآية كاملة بدون اختصار. "
                "اكتب 2-3 جمل مفيدة تتضمن التحيّة والآية المطلوبة وتشجيع بسيط."
            )
        return (
            f"أنت معلم قرآن لطفلة اسمها {child_name}. "
            f"{position_info} "
            f"الآية المطلوبة الآن هي: {ayah_text}. "
            f"اشرح لـ {child_name} بلطف أن هذه الآية التالية، واطلب منها أن تقرأها بتمهل. "
            "اكتب ردك بالعربية الفصحى فقط. لا تستخدم الإنجليزية أبداً. "
            "لا تسلّم مرة أخرى. كن مشجعاً. اذكر الآية كاملة بدون اختصار. "
            "اكتب 2-3 جمل تتضمن شرح بسيط والآية وتشجيع."
        )

    if lesson_context and lesson_context["content"].get("letter"):
        letter_name = lesson_context["content"].get("name") or lesson_context["title"]
        letter = lesson_context["content"].get("letter")
        words = lesson_context["content"].get("words", [])
        words_hint = f" من الكلمات التي تحتوي هذا الحرف: {', '.join(words[:3])}." if words else ""

        if include_greeting:
            return (
                f"أنت معلم لطفلة اسمها {child_name}. الدرس اليوم هو تعلّم الحرف {letter_name} ({letter}). "
                f"{words_hint} "
                f"سلّم على {child_name} بحرارة، ثم عرّفها على الحرف {letter_name} واطلب منها أن تكرره مرة واحدة. "
                "اكتب ردك بالعربية الفصحى فقط. لا تستخدم الإنجليزية أبداً. كن مشجعاً ولطيفاً. اكتب 2-3 جمل."
            )
        return (
            f"أنت معلم لطفلة اسمها {child_name}. "
            f"اطلب منها أن تكرر الحرف {letter_name} ({letter}) مرة واحدة. "
            "اكتب ردك بالعربية الفصحى فقط. لا تستخدم الإنجليزية أبداً. "
            "لا تسلّم مرة أخرى. كن مشجعاً. اكتب 1-2 جمل."
        )

    if include_greeting:
        return (
            f"أنت معلم لطفلة اسمها {child_name}. "
            f"سلّم على {child_name} بحرارة وادعُها لبدء الدرس الأول اليوم. "
            "اكتب ردك بالعربية الفصحى فقط. لا تستخدم الإنجليزية أبداً. كن مشجعاً ولطيفاً."
        )
    return (
        f"أنت معلم لطفلة اسمها {child_name}. "
        f"وجّه {child_name} للمتابعة في الدرس الحالي. "
        "اكتب ردك بالعربية الفصحى فقط. لا تستخدم الإنجليزية أبداً. لا تسلّم مرة أخرى."
    )


@router.websocket("/ws")
async def realtime_ws(websocket: WebSocket):
    await websocket.accept()

    session_id = websocket.query_params.get("session")
    subject = websocket.query_params.get("subject", "quran")
    child_id = websocket.query_params.get("childId", "student")

    print(f"[REALTIME] New connection: session={session_id}, child={child_id}, subject={subject}")

    try:
        hf_api_key = get_hf_api_key()
    except ValueError as exc:
        await websocket.send_json({"type": "error", "message": str(exc)})
        await websocket.close(code=1011)
        return

    active_subject = subject
    active_system_prompt = _build_system_prompt(subject)
    active_child_name = "friend"
    active_child_key = child_id or "student"
    active_lesson_context = None
    current_ayah_index = 0

    async def send_tutor_message(text: str, ayah_index: int | None = None):
        """Send tutor text + generate TTS audio."""
        import asyncio as _aio
        is_arabic = active_subject == "quran" or any("\u0600" <= c <= "\u06FF" for c in text)
        try:
            loop = _aio.get_running_loop()
            audio_file = await loop.run_in_executor(None, _generate_tts, text, is_arabic)
        except Exception as e:
            print(f"[TTS] run_in_executor failed: {e}")
            audio_file = None
        msg = {"type": "assistant_sentence", "text": text}
        if ayah_index is not None:
            msg["ayahIndex"] = ayah_index
        if audio_file:
            msg["audio"] = f"/api/realtime/audio/{audio_file}"
        await websocket.send_json(msg)
        await websocket.send_json({"type": "turn_complete"})


    def _build_openclaw_system_prompt(system_prompt_text: str | None = None) -> str:
        memory_block = OPENCLAW_MEMORY.get_context_block(active_child_key, active_subject)
        return compose_openclaw_prompt(
            system_prompt_text or active_system_prompt,
            OPENCLAW_SKILL_TEXT,
            memory_block,
        )

    async def generate_reply(
        user_text: str,
        system_prompt_text: str | None = None,
        remember_user_text: str | None = None,
    ) -> str:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://router.huggingface.co/v1/chat/completions",
                headers={"Authorization": f"Bearer {hf_api_key}"},
                json={
                    "model": MODEL,
                    "messages": [
                        {"role": "system", "content": _build_openclaw_system_prompt(system_prompt_text)},
                        {"role": "user", "content": user_text},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 256,
                },
            )
        response.raise_for_status()
        reply = (response.json()["choices"][0]["message"]["content"] or "").strip()
        if remember_user_text:
            OPENCLAW_MEMORY.remember_turn(active_child_key, active_subject, remember_user_text, reply)
        return reply

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
                active_child_key = (
                    (msg.get("childId") or msg.get("childName") or child_id or "student").strip() or "student"
                )
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
                await send_tutor_message(reply, current_ayah_index)

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
                await send_tutor_message(reply, current_ayah_index)

            elif msg_type == "text":
                raw_user_text = (msg.get("data", "") or "").strip()
                user_text = raw_user_text
                ayahs = (active_lesson_context or {}).get("content", {}).get("ayahs") or []
                if ayahs:
                    target_ayah = ayahs[max(0, min(current_ayah_index, len(ayahs) - 1))]
                    user_text = (
                        f"الآية المطلوبة: {target_ayah}. "
                        f"الطفلة قالت: {raw_user_text}. "
                        "قيّم محاولتها باختصار وشجّعها، ثم أعطها الخطوة التالية لنفس الآية. "
                        "اكتب ردك بالعربية الفصحى فقط. لا تستخدم الإنجليزية أبداً. كن مشجعاً ولطيفاً."
                    )
                elif active_subject == "quran":
                    user_text = (
                        f"الطفلة قالت: {raw_user_text}. "
                        "قيّم محاولتها باختصار وشجّعها. "
                        "اكتب ردك بالعربية الفصحى فقط. لا تستخدم الإنجليزية أبداً. كن مشجعاً."
                    )
                reply = await generate_reply(user_text, remember_user_text=raw_user_text)
                await send_tutor_message(reply, current_ayah_index)

            elif msg_type == "audio_chunk":
                # Client sends base64-encoded audio chunk
                # Buffer chunks until client sends audio_end
                if not hasattr(websocket, '_audio_buffer'):
                    websocket._audio_buffer = []
                import base64
                chunk_data = msg.get("data", "")
                if chunk_data:
                    websocket._audio_buffer.append(base64.b64decode(chunk_data))

            elif msg_type == "audio_end":
                # Client finished recording — transcribe via HF Whisper
                import base64
                audio_chunks = getattr(websocket, '_audio_buffer', [])
                websocket._audio_buffer = []

                if not audio_chunks:
                    await websocket.send_json({"type": "error", "message": "No audio received."})
                    continue

                try:
                    await websocket.send_json({"type": "processing", "message": "جاري التحليل..."})

                    # Combine chunks into single WAV-compatible blob
                    raw_audio = b"".join(audio_chunks)

                    # Transcribe via HuggingFace Inference API
                    hf_api_key = get_secret("HF_API_KEY", "")
                    if not hf_api_key:
                        await websocket.send_json({"type": "error", "message": "HF API key not configured."})
                        continue

                    # Convert webm/opus to wav if needed using ffmpeg
                    with tempfile.TemporaryDirectory(prefix="tacotutor-stt-") as tmpdir:
                        raw_path = Path(tmpdir) / "input.webm"
                        wav_path = Path(tmpdir) / "input.wav"

                        with open(raw_path, "wb") as f:
                            f.write(raw_audio)

                        # Convert to 16kHz mono WAV
                        conv_result = subprocess.run(
                            ["ffmpeg", "-y", "-i", str(raw_path), "-ac", "1", "-ar", "16000", str(wav_path)],
                            capture_output=True, timeout=10,
                        )
                        if conv_result.returncode != 0:
                            # Maybe it's already WAV? Try direct
                            wav_path = raw_path
                            if not raw_audio[:4] == b'RIFF':
                                await websocket.send_json({"type": "error", "message": "Audio conversion failed."})
                                continue

                        # Call HuggingFace Whisper
                        with open(wav_path, "rb") as af:
                            audio_bytes = af.read()

                        async with httpx.AsyncClient(timeout=30) as client:
                            resp = await client.post(
                                "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3-turbo",
                                headers={
                                    "Authorization": f"Bearer {hf_api_key}",
                                    "Content-Type": "audio/wav",
                                },
                                content=audio_bytes,
                            )

                        if resp.status_code != 200:
                            print(f"[REALTIME] HF STT error: {resp.status_code} {resp.text}")
                            await websocket.send_json({"type": "error", "message": "Speech recognition failed."})
                            continue

                        result = resp.json()
                        transcription = (result.get("text", "") or "").strip()

                    if not transcription:
                        await websocket.send_json({"type": "transcription", "text": "", "words": []})
                        continue

                    await websocket.send_json({"type": "transcription", "text": transcription})

                    # Compare against target ayah
                    ayahs = (active_lesson_context or {}).get("content", {}).get("ayahs") or []
                    if ayahs and active_lesson_context:
                        target_ayah = ayahs[max(0, min(current_ayah_index, len(ayahs) - 1))]
                        comparison = _compare_recitation(transcription, target_ayah)
                        await websocket.send_json({
                            "type": "recitation_feedback",
                            "accuracy": comparison["accuracy"],
                            "correct_words": comparison["correct_words"],
                            "missed_words": comparison["missed_words"],
                            "extra_words": comparison["extra_words"],
                            "target_ayah": target_ayah,
                        })

                        # Generate kid-friendly feedback with the HF text model
                        feedback_prompt = (
                            f"The child recited: {transcription}\n"
                            f"Target ayah: {target_ayah}\n"
                            f"Accuracy: {comparison['accuracy']}%\n"
                            f"Missed words: {', '.join(comparison['missed_words'])}\n"
                            f"The child's name is {active_child_name}. "
                            f"In one short, encouraging Arabic sentence, give feedback on this recitation. "
                            "Reply in simple Arabic only. Do not use English."
                        )
                        reply = await generate_reply(feedback_prompt, remember_user_text=transcription)
                        await send_tutor_message(reply, current_ayah_index)
                    else:
                        # No target ayah — just send transcription for general feedback
                        user_text = (
                            f"The child recited: {transcription}. "
                            "In one short, encouraging Arabic sentence, give feedback. "
                            f"The child's name is {active_child_name}. "
                            "Reply in simple Arabic only. Do not use English."
                        )
                        reply = await generate_reply(user_text, remember_user_text=transcription)
                        await send_tutor_message(reply, current_ayah_index)

                except Exception as e:
                    print(f"[REALTIME] Audio processing error: {e}")
                    import traceback; traceback.print_exc()
                    await websocket.send_json({"type": "error", "message": f"Audio error: {str(e)[:100]}"})


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


def _compare_recitation(transcription: str, reference: str) -> dict:
    """Compare transcribed recitation against reference ayah text.
    Returns word-level accuracy feedback."""
    import re

    def normalize(s: str) -> list[str]:
        # Remove diacritics/tashkeel for comparison, split into words
        # Keep base letters only
        s = re.sub(r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]', '', s)
        s = re.sub(r'\s+', ' ', s).strip()
        return s.split()

    ref_words = normalize(reference)
    rec_words = normalize(transcription)

    if not ref_words:
        return {"accuracy": 0, "correct_words": [], "missed_words": [], "extra_words": rec_words}

    # Simple alignment: find matching words in order
    correct = []
    missed = []
    rec_idx = 0
    for ref_w in ref_words:
        found = False
        for j in range(rec_idx, min(rec_idx + 3, len(rec_words))):  # look ahead 2 words
            if rec_words[j] == ref_w:
                correct.append(ref_w)
                rec_idx = j + 1
                found = True
                break
        if not found:
            missed.append(ref_w)

    extra = rec_words[rec_idx:] if rec_idx < len(rec_words) else []
    accuracy = round(len(correct) / len(ref_words) * 100) if ref_words else 0

    return {
        "accuracy": accuracy,
        "correct_words": correct,
        "missed_words": missed,
        "extra_words": extra,
    }


def shutil_copyfileobj(fsrc, fdst, length=16*1024):
    """Helper to copy file-like objects."""
    import shutil
    shutil.copyfileobj(fsrc, fdst, length)
