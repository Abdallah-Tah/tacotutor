# TacoTutor 🌮📚

**AI-powered voice tutor for kids** — Quran, English, and Math lessons with real-time voice interaction.

Built by [Abdallah Mohamed](https://github.com/Abdallah-Tah) with help from [Taco](https://github.com/openclaw/openclaw) (OpenClaw AI agent).

---

## What is TacoTutor?

TacoTutor is a web-based AI tutor designed for children ages 4-8. It provides interactive lessons in:

| Subject | Content |
|---------|---------|
| 🕌 **Quran & Arabic** | Arabic letters (Alif, Ba, Ta...), short surahs (Al-Fatiha, Al-Ikhlas, Al-Falaq, An-Nas), tajweed basics |
| 📖 **English** | Phonics (A-Z letter sounds), sight words (Grade 1), simple sentence reading & writing |
| 🔢 **Math** | Counting (1-20), addition (within 10), subtraction (within 10), word problems |
| ✏️ **Writing** | Letter tracing, word building, sentence construction |

### How it works

1. **Child opens the app** on a phone, tablet, or computer
2. **Enters their name** and **picks a subject**
3. **TacoTutor greets them** by voice and starts the lesson
4. **Child responds** by typing or speaking (voice input)
5. **TacoTutor replies** with encouragement, corrections, and next steps — **with audio**
6. **Progress is saved** automatically per child — resumes where they left off

### Key features

- 🎤 **Voice input** — kids can speak instead of typing (browser Speech Recognition API)
- 🔊 **Voice output** — every reply comes with TTS audio (auto-play)
- 🧠 **AI-powered** — flexible LLM backend (Gemini, OpenAI, Ollama, etc.)
- 📊 **Progress tracking** — per-child progress saved in JSON
- 📱 **Mobile-first** — dark theme, responsive design, optimized for phones/tablets
- 🔄 **Multi-provider** — swap LLM, STT, and TTS providers via config file

---

## Architecture

```
Phone/Tablet Browser
    ↕ (HTTP/WebSocket)
Flask Web Server (Pi/MacBook)
    ↕
┌─────────────────────────────────┐
│  LLM (Gemini/OpenAI/Ollama...)  │
│  TTS (Edge-TTS / Gemini TTS)    │
│  STT (faster-whisper / Deepgram)│
│  Curriculum (Quran/English/Math)│
│  Progress Tracker (JSON)        │
└─────────────────────────────────┘
```

**Provider flexibility** — swap any provider by editing `config/providers.yaml`:

| Component | Providers |
|-----------|-----------|
| **LLM** | Ollama (local), OpenAI, Anthropic, Gemini, MiniMax, GLM, OpenRouter |
| **TTS** | Edge-TTS (free, no API key), Gemini TTS |
| **STT** | faster-whisper (local, free), Deepgram |

---

## Setup Guide

### Prerequisites

- Python 3.10+
- At least one LLM API key (or Ollama for local)
- Works on Raspberry Pi, MacBook, or any Linux/macOS machine

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Abdallah-Tah/tacotutor.git
cd tacotutor

# 2. Create virtual environment
python3 -m venv venv
source venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure your API keys
cp .env.example .env
# Edit .env and add at least one LLM API key
```

### Configuration

Edit `config/providers.yaml` to set your active providers:

```yaml
active:
  llm: gemini        # ollama | openai | anthropic | gemini | minimax | glm | openrouter
  stt: local         # local (free) | deepgram
  tts: edge          # edge (free) | gemini
```

Set API keys in `.env`:

```bash
# Only set keys for providers you use
GEMINI_API_KEY=AIza...          # For Gemini LLM + TTS
OPENAI_API_KEY=sk-...           # For OpenAI LLM
ANTHROPIC_API_KEY=sk-ant-...    # For Claude
OLLAMA_BASE_URL=http://localhost:11434  # For local Ollama (no key needed)
```

### Running

```bash
# Web mode (phone/tablet access)
python web.py

# Text mode (terminal, for testing)
python bot.py --subject quran --child Ali --text

# Voice mode (Pipecat, coming soon)
python voice.py --subject quran --child Ali
```

The web server will show:
```
🌮 TacoTutor running at: http://192.168.x.x:8088
   Open this URL on your phone!
```

Open that URL on any device on the same network.

### Firewall

If you can't access the app from another device, open the port:

```bash
# Linux/Raspberry Pi
sudo ufw allow 8088/tcp

# Or with iptables
sudo iptables -A INPUT -p tcp --dport 8088 -j ACCEPT
```

---

## Project Structure

```
tacotutor/
├── web.py                     # Flask web server (main entry point)
├── bot.py                     # Agent core (text chat mode)
├── voice.py                   # Pipecat voice pipeline (coming soon)
├── config/
│   └── providers.yaml         # Provider configuration (LLM, STT, TTS)
├── templates/
│   └── index.html             # Mobile-first web UI
├── tutor/
│   ├── llm/providers.py       # 7 LLM providers (Ollama, OpenAI, Anthropic, Gemini, MiniMax, GLM, OpenRouter)
│   ├── stt/providers.py       # 2 STT providers (faster-whisper, Deepgram)
│   ├── tts/providers.py       # 2 TTS providers (Edge-TTS, Gemini TTS)
│   ├── curriculum/lessons.py  # Lesson content (Quran, English, Math)
│   ├── prompts.py             # System prompts per subject
│   └── progress.py            # Per-child progress tracker
├── data/
│   └── progress.json          # Auto-generated child progress
├── requirements.txt
├── .env.example
└── README.md
```

---

## Real-time Upgrade Guide

For a concrete implementation roadmap (WebSocket events, streaming STT/LLM/TTS, barge-in, and rollout phases), see:

- [`docs/realtime-roadmap.md`](docs/realtime-roadmap.md)

---

## Current Status

| Feature | Status |
|---------|--------|
| Web interface | ✅ Working |
| Multi-provider LLM | ✅ Working (7 providers) |
| TTS audio output | ✅ Working (Edge-TTS, Gemini TTS) |
| Voice input (browser) | ✅ Working (Speech Recognition API) |
| Progress tracking | ✅ Working |
| Quran curriculum | ✅ Working (letters + surahs) |
| English curriculum | ✅ Working (phonics + sight words) |
| Math curriculum | ✅ Working (counting + add/sub) |
| Real-time voice pipeline | 🔲 Coming soon (Pipecat) |
| Browser WebRTC client | 🔲 Planned |
| Worksheet generation | 🔲 Planned |
| Parent dashboard | 🔲 Planned |
| Kid profiles | 🔲 Planned |

---

## Known Issues

- **iOS Safari**: Button clicks may not register due to Safari JavaScript limitations. Use Chrome on iOS or test from a computer browser.
- **Chinese translation**: Some phones auto-translate the page. Fixed with `notranslate` meta tags.
- **Arabic TTS**: Edge-TTS Arabic voice reads Arabic text correctly but may not handle English/Arabic mixed content well.
- **Rate limits**: Gemini free tier has 10 req/min limit for TTS.

---

## Tech Stack

- **Backend**: Python 3.10+, Flask
- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **LLM**: Gemini API (default), supports 7 providers
- **TTS**: Edge-TTS (default), Gemini TTS
- **STT**: faster-whisper (local), Deepgram
- **Voice pipeline**: Pipecat (planned)
- **Fonts**: Nunito (Google Fonts)

---

## License

MIT

---

## Credits

- Built by [Abdallah Mohamed](https://github.com/Abdallah-Tah)
- AI assistance by [Taco](https://github.com/openclaw/openclaw) (OpenClaw agent)
- Voice pipeline: [Pipecat](https://github.com/pipecat-ai/pipecat)
- TTS: [edge-tts](https://github.com/rany2/edge-tts), Google Gemini TTS
- STT: [faster-whisper](https://github.com/SYSTRAN/faster-whisper)
