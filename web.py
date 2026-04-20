"""
TacoTutor — Web interface for phone/tablet testing.
Runs on Pi, accessible from any device on the same network.
"""

import asyncio
import os
import sys
import uuid
import json
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from flask import Flask, render_template, request, jsonify, send_file
from tutor.llm.providers import get_llm
from tutor.tts.providers import get_tts
from tutor.curriculum.lessons import get_curriculum
from tutor.prompts import get_system_prompt
from tutor.progress import ProgressTracker
from tutor.openclaw import OpenClawMemory, compose_openclaw_prompt, load_openclaw_skill

app = Flask(__name__)
TTS_DIR = Path("/tmp/tacotutor_tts")
TTS_DIR.mkdir(exist_ok=True)

# In-memory sessions per child
sessions = {}
progress = ProgressTracker()
openclaw_memory = OpenClawMemory()
openclaw_skill = load_openclaw_skill()


def _compose_system_prompt(base_prompt: str, child: str, subject: str) -> str:
    memory_block = openclaw_memory.get_context_block(child, subject)
    return compose_openclaw_prompt(base_prompt, openclaw_skill, memory_block)


def get_or_create_session(child: str, subject: str) -> dict:
    key = f"{child}:{subject}"
    if key not in sessions:
        curriculum = get_curriculum(subject)
        p = progress.get_progress(child)
        subj = p["subjects"].get(subject, {"level": 1, "lesson_index": 0})
        level = subj["level"]
        lesson_idx = subj["lesson_index"]
        level_data = curriculum.get(level, curriculum[1])
        lessons = level_data["lessons"]
        if lesson_idx >= len(lessons):
            lesson_idx = 0
        lesson = lessons[lesson_idx]
        base_system_prompt = get_system_prompt(subject, level_data, lesson, grade=1)
        system_prompt = _compose_system_prompt(base_system_prompt, child, subject)
        sessions[key] = {
            "child": child,
            "subject": subject,
            "level": level,
            "lesson_index": lesson_idx,
            "level_data": level_data,
            "lesson": lesson,
            "curriculum": curriculum,
            "base_system_prompt": base_system_prompt,
            "history": [{"role": "system", "content": system_prompt}],
            "llm": get_llm(),
            "tts": get_tts(),
        }
    return sessions[key]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/start", methods=["POST"])
def api_start():
    data = request.json or {}
    child = data.get("child", "student")
    subject = data.get("subject", "quran")
    session = get_or_create_session(child, subject)
    return jsonify({
        "child": child,
        "subject": subject,
        "level": session["level"],
        "level_name": session["level_data"]["name"],
        "lesson": session["lesson"],
    })


@app.route("/api/chat", methods=["POST"])
async def api_chat():
    data = request.json or {}
    child = data.get("child", "student")
    subject = data.get("subject", "quran")
    message = data.get("message", "")
    language = data.get("language", "en")

    if not message.strip():
        return jsonify({"error": "Empty message"}), 400

    session = get_or_create_session(child, subject)
    try:
        session["history"][0]["content"] = _compose_system_prompt(
            session["base_system_prompt"], child, subject
        )
        session["history"].append({"role": "user", "content": message})
        reply = await session["llm"].chat(session["history"])
        session["history"].append({"role": "assistant", "content": reply})
        openclaw_memory.remember_turn(child, subject, message, reply)

        # Generate TTS audio
        audio_id = str(uuid.uuid4())[:8]
        audio_path = str(TTS_DIR / f"{audio_id}.mp3")
        await session["tts"].speak(reply, language=language, output_path=audio_path)

        return jsonify({
            "reply": reply,
            "audio": f"/api/audio/{audio_id}",
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/audio/<audio_id>")
def api_audio(audio_id):
    path = TTS_DIR / f"{audio_id}.mp3"
    if not path.exists():
        return "Not found", 404
    return send_file(str(path), mimetype="audio/mpeg")


@app.route("/api/subjects")
def api_subjects():
    return jsonify({
        "subjects": [
            {"id": "quran", "name": "🕌 Quran & Arabic", "desc": "Letters, surahs, tajweed"},
            {"id": "english", "name": "📖 English", "desc": "Phonics, reading, writing"},
            {"id": "math", "name": "🔢 Math", "desc": "Counting, addition, subtraction"},
        ]
    })


if __name__ == "__main__":
    # Get Pi's local IP
    import socket
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "192.168.40.209"
    finally:
        s.close()

    print(f"\n🌮 TacoTutor running at: http://{ip}:8088")
    print(f"   Open this URL on your phone!\n")
    app.run(host="0.0.0.0", port=8088, debug=False)
