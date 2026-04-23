# TacoTutor v2.0

**AI-powered Quran Tutoring Platform for Kids**

A production-ready platform with real-time voice tutoring, parent dashboards, lesson management,
and custom instruction files via Markdown.

---

## Architecture

```
Browser (React + Vite + Tailwind)
    |
    v
FastAPI Backend (8088)
    |
    +-- Auth (JWT + Google OAuth)
    +-- Users (parent/child profiles)
    +-- Lessons (CRUD + assignments)
    +-- Sessions (progress tracking)
    +-- Instructions (Markdown files)
    +-- Real-time WebSocket (/api/realtime)
    |
    v
PostgreSQL Database
    |
    v
Legacy Flask Server (8088 - backward compat)
```

---

## What's New in v2.0

### Platform Foundation
- **React frontend** with Vite, Tailwind CSS, Framer Motion
- **FastAPI backend** with PostgreSQL, SQLAlchemy
- **Auth system** with JWT tokens and Google OAuth
- **Parent dashboard** with child management, progress overview
- **Kid dashboard** with streaks, rewards, lesson cards
- **Lesson management** with assignment system
- **Instruction files** via Markdown with parser

### Database Schema
- Users (parents + admin)
- Children (profiles per parent)
- Student profiles (learning settings)
- Lessons (Quran, English, Math)
- Lesson assignments
- Session history
- Recitation attempts
- Progress records
- Mistake logs
- Rewards/streaks
- Instruction files

### Quran Features
- Embedded Quran text for offline use
- Word highlighting system
- Ayah navigator
- Progress tracking per ayah
- Visual feedback (correct/incorrect words)

### Real-Time Foundation
- WebSocket endpoint for live tutoring
- Teaching loop: LISTEN -> TRANSCRIBE -> MATCH -> DECIDE -> RESPOND -> REPEAT
- Quran matcher with Arabic text normalization
- Session manager for state persistence
- Barge-in support (child interrupts tutor)

---

## Quick Start

### 1. Install Dependencies

```bash
# Backend
pip install -r requirements.txt

# Frontend
cd app && npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
# Edit .env and add:
# DATABASE_URL=postgresql://user:pass@localhost:5432/tacotutor
# SECRET_KEY=your-secret-key
# GOOGLE_CLIENT_ID=...
# GOOGLE_CLIENT_SECRET=...
```

### 3. Run the Platform

```bash
# Development (auto-reload)
python main.py

# Or directly with uvicorn
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8088

# Build frontend manually if you are not using `python main.py`
cd app && npm run build
```

`python main.py` now checks whether `app/dist` is missing or older than the frontend source files and runs `npm run build` automatically when needed.

### 4. Access the App

```
http://localhost:8088          # React app (served by FastAPI)
http://localhost:8088/api/docs  # API documentation (Swagger)
```

---

## Project Structure

```
tacotutor/
├── app/                          # React + Vite frontend
│   ├── src/
│   │   ├── components/           # UI components
│   │   ├── pages/                # Route pages
│   │   │   ├── Welcome.tsx
│   │   │   ├── auth/             # Login, Signup
│   │   │   ├── parent/           # ParentDashboard, ChildProfile
│   │   │   ├── kid/              # KidDashboard
│   │   │   ├── lesson/           # LessonManagement, LessonPlayer
│   │   │   └── live/             # LiveTutorSession
│   │   ├── hooks/                # Custom React hooks
│   │   ├── stores/               # Zustand state stores
│   │   ├── services/             # API clients
│   │   └── types/                # TypeScript types
│   └── package.json
│
├── backend/                      # FastAPI backend
│   ├── main.py                   # Entry point
│   ├── core/                     # Config, database, security
│   ├── api/                      # REST + WebSocket routes
│   │   ├── auth.py
│   │   ├── users.py
│   │   ├── lessons.py
│   │   ├── sessions.py
│   │   ├── instructions.py
│   │   └── realtime.py
│   ├── models/                   # SQLAlchemy models
│   ├── schemas/                  # Pydantic schemas
│   └── services/                 # Business logic
│       ├── tutor_engine.py
│       ├── quran_matcher.py
│       ├── instruction_loader.py
│       └── session_manager.py
│
├── instructions/                 # Markdown instruction files
│   ├── default_quran.md
│   ├── beginner_reading.md
│   └── memorization_mode.md
│
├── tutor/                        # Legacy modules (kept for compatibility)
│   ├── llm/
│   ├── stt/
│   ├── tts/
│   ├── curriculum/
│   ├── prompts.py
│   ├── progress.py
│   └── openclaw.py
│
├── web.py                        # Legacy Flask server
├── live.py                       # Gemini Live WebSocket server
├── config/
│   └── providers.yaml            # Provider configuration
├── data/                         # SQLite / JSON data (legacy)
└── requirements.txt
```

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/signup` | Create parent account |
| `POST /api/auth/login` | Login with email/password |
| `POST /api/auth/google` | Google OAuth login |
| `GET /api/auth/me` | Get current user |
| `POST /api/users/children` | Add child |
| `GET /api/users/children` | List children |
| `GET /api/lessons` | List lessons |
| `POST /api/lessons/assign` | Assign lesson to child |
| `POST /api/sessions/start` | Start tutoring session |
| `POST /api/sessions/{id}/end` | End session |
| `GET /api/sessions/dashboard/parent` | Parent dashboard data |
| `GET /api/sessions/dashboard/kid/{child_id}` | Kid dashboard data |
| `POST /api/instructions` | Create instruction file |
| `GET /api/instructions` | List instruction files |
| `WS /api/realtime` | Live tutoring WebSocket |

---

## Real-Time Tutoring Pipeline

```
LISTEN      -> capture child audio via WebSocket
TRANSCRIBE  -> streaming STT (partial + final transcripts)
MATCH       -> QuranMatcher compares with expected ayah
DECIDE      -> accuracy score -> encourage / gentle correction / stop & fix
RESPOND     -> LLM generates feedback + TTS streams audio
REPEAT      -> continue without resetting session
```

### WebSocket Events

**Client -> Server:**
- `session_start`
- `audio_frame` (base64 PCM)
- `user_text` (fallback)
- `barge_in` (child interrupted)
- `session_end`

**Server -> Client:**
- `partial_transcript`
- `final_transcript`
- `matching_result`
- `assistant_sentence`
- `audio_chunk` (base64 PCM)
- `word_highlight`
- `session_state`
- `turn_complete`

---

## Instruction File Format

```markdown
# Instruction: [Name]

## Metadata
level: beginner | intermediate | advanced
mode: reading | memorization | tajweed
pace: slow | medium | fast
subject: quran

## Target
- Surah: [name]
- Ayah: [range]

## Goals
- [goal 1]
- [goal 2]

## Teaching Rules
- [rule 1]
- [rule 2]

## Correction Rules
- [rule 1]
- [rule 2]

## Visual Guidance Rules
- [rule 1]

## Tutor Behavior
- [behavior 1]

## Parent Notes
- [note 1]
```

---

## Tech Stack

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- Framer Motion
- Zustand (state management)
- React Router
- Axios
- Lucide React (icons)

**Backend:**
- FastAPI
- SQLAlchemy + PostgreSQL
- Pydantic
- JWT (python-jose)
- bcrypt (passlib)
- python-multipart

**AI Providers:**
- LLM: Gemini, OpenAI, Anthropic, Ollama
- STT: faster-whisper, Deepgram, Gemini
- TTS: Edge-TTS, Gemini TTS

---

## Roadmap

### v2.0 (Current)
- Platform foundation (auth, dashboards, lessons)
- Database-backed architecture
- Markdown instruction files
- Quran word highlighting
- Real-time WebSocket foundation

### v2.1 (Next)
- Full streaming STT/LLM/TTS pipeline
- Barge-in with audio cancellation
- Visual word tracking in real-time
- Session persistence across page reloads

### v2.2 (Future)
- WebRTC for lower latency
- Pipecat integration
- Multi-child sessions
- Parent reports and analytics

---

## License

MIT

---

## Credits

- Built by [Abdallah Mohamed](https://github.com/Abdallah-Tah)
- AI assistance by Taco (OpenClaw agent)
