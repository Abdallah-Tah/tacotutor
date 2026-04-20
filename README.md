# TacoTutor 🌮📚

Real-time AI voice tutor for kids — Quran, English, Math, and Writing.

Built with [Pipecat](https://github.com/pipecat-ai/pipecat) for real-time voice, with flexible LLM/STT/TTS backends.

## Features

- 🕌 **Quran** — Arabic letters, short surahs, tajweed basics
- 📖 **English** — Phonics, sight words, reading (Grade 1-2)
- 🔢 **Math** — Counting, addition, subtraction
- ✏️ **Writing** — Letter tracing, word building
- 🎤 **Real-time voice** — Talk naturally, agent responds by voice
- 🔄 **Flexible AI** — Swap LLM/STT/TTS providers via config

## Supported AI Providers

| Type | Providers |
|------|-----------|
| **LLM** | Ollama (local), OpenAI, Anthropic, Gemini, MiniMax, GLM, OpenRouter |
| **STT** | faster-whisper (local), Deepgram |
| **TTS** | Edge-TTS (free), Gemini TTS |

## Quick Start

```bash
# Clone
git clone https://github.com/Abdallah-Tah/tacotutor.git
cd tacotutor

# Create venv
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Text mode (no mic needed)
python bot.py --subject quran --child Ali --text

# Voice mode (needs Pipecat + mic)
python voice.py --subject quran --child Ali
```

## Configuration

Edit `config/providers.yaml` to set your active providers:

```yaml
active:
  llm: ollama      # ollama | openai | anthropic | gemini | minimax | glm | openrouter
  stt: local       # local | deepgram
  tts: edge        # edge | gemini
```

Set API keys in `.env`:

```bash
# Only needed for the providers you use
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
```

## Project Structure

```
tacotutor/
├── bot.py                  # Main agent (text + voice orchestrator)
├── voice.py                # Pipecat real-time voice pipeline
├── config/
│   └── providers.yaml      # AI provider configuration
├── tutor/
│   ├── llm/providers.py    # LLM backends (7 providers)
│   ├── stt/providers.py    # Speech-to-text backends
│   ├── tts/providers.py    # Text-to-speech backends
│   ├── curriculum/lessons.py  # Lesson content
│   ├── prompts.py          # System prompts per subject
│   └── progress.py         # Session progress tracker
├── data/
│   └── progress.json       # Auto-generated child progress
└── requirements.txt
```

## Roadmap

- [x] Multi-provider LLM/STT/TTS architecture
- [x] Curriculum data (Quran, English, Math)
- [x] Text chat mode
- [x] Progress tracking
- [ ] Pipecat voice pipeline (MacBook mic/speaker)
- [ ] Browser WebRTC client
- [ ] Worksheet/image generation
- [ ] Kid profiles & parent dashboard
- [ ] Arabic voice optimization

## License

MIT
