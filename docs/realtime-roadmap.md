# TacoTutor Real-Time Listening + Answering Roadmap

This plan upgrades TacoTutor from **turn-based voice** (speak → wait → answer) to a **low-latency conversation loop**.

## 1) Define real-time targets

Use measurable goals so the architecture stays focused:

- **Mic-to-text partials**: < 300 ms
- **End-of-utterance to first AI token**: < 700 ms
- **First audible AI audio**: < 1.2 s
- **Barge-in (child interrupts tutor)**: stop AI audio in < 200 ms

## 2) Replace browser-only SpeechRecognition with streaming STT

Current setup uses browser SpeechRecognition, which has variable latency and browser differences.

Recommended:

- Capture microphone in browser with **WebRTC**.
- Send audio frames to backend over **WebSocket**.
- Use streaming STT (Deepgram/Whisper streaming) and emit:
  - `partial_transcript`
  - `final_transcript`
  - `vad_start` / `vad_end`

Result: child sees live transcript while speaking and doesn't wait for full recognition completion.

## 3) Stream LLM output token-by-token

Once VAD detects end-of-utterance and final transcript arrives:

- Send transcript to LLM with streaming enabled.
- Forward text chunks to UI as events:
  - `assistant_token`
  - `assistant_sentence`
  - `assistant_done`

For current providers:

- **Best first step**: enable streaming for OpenAI-compatible providers and Ollama.
- **Fallback** for non-streaming providers: chunk complete response into sentence updates (keeps UI consistent).

## 4) Start TTS before full response completes

Instead of waiting for full assistant text:

- Buffer LLM tokens until sentence boundary (`.`, `?`, `!`, Arabic punctuation).
- Send sentence chunks to TTS immediately.
- Stream audio chunks back to browser and play continuously.

This creates the “instant speaking tutor” effect.

## 5) Add interruption (barge-in)

When child starts speaking while tutor is talking:

- Stop current audio playback in browser.
- Cancel active LLM/TTS generation on backend.
- Prioritize new child utterance.

This is essential for natural conversation with kids.

## 6) Suggested event protocol (WebSocket)

From client → server:

- `audio_frame`
- `start_session`
- `stop_audio`
- `user_text` (fallback for typed mode)

From server → client:

- `partial_transcript`
- `final_transcript`
- `assistant_token`
- `assistant_sentence`
- `audio_chunk`
- `turn_metrics`
- `error`

Keep the existing `/api/chat` endpoint for non-realtime fallback and compatibility.

## 7) Rollout plan

### Phase 1 (Fast win)

- Add WebSocket channel.
- Stream partial STT transcript to UI.
- Keep existing turn-based LLM/TTS for final answer.

### Phase 2

- Enable provider token streaming.
- Render assistant typing in real time.

### Phase 3

- Sentence-level streaming TTS.
- Continuous audio playback and barge-in.

### Phase 4

- Full duplex with Pipecat (or equivalent orchestration).
- Adaptive pacing for age 4–8 (slower speech, pauses, confirmations).

## 8) Observability and quality checks

Track per turn:

- STT latency
- LLM first-token latency
- TTS first-audio latency
- total turn duration
- interruption count

Log these in JSON so you can compare providers and tune quickly.

## 9) Child-safety interaction guardrails for real-time mode

Real-time mode needs extra controls:

- strict max response length by age (short sentences)
- encouragement-first correction style
- refusal policy for unsafe content
- language lock per session (avoid accidental auto-switch)

## 10) Immediate next implementation task list

1. Add WebSocket endpoint in `web.py` (or migrate to FastAPI for first-class async WS).
2. Add client audio capture and WS transport in `templates/index.html`.
3. Implement partial transcript event rendering.
4. Add provider streaming interface in `tutor/llm/providers.py` with fallback adapter.
5. Add sentence chunker + incremental TTS queue in `tutor/tts/providers.py`.
6. Add barge-in cancellation tokens across STT/LLM/TTS tasks.

---

If you'd like, the next step can be a concrete **Phase 1 patch** (WebSocket + partial transcripts + UI updates) so TacoTutor feels live right away.
