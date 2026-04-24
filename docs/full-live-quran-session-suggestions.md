# Full Live Quran Session (Hands-Free) — Online-Informed Suggestions

## Goal
Create a **true live call experience** for Quran mode where:
1. Tutor reads the ayah.
2. Child replies naturally (no press-to-talk button).
3. System auto-detects turns and gives real-time feedback + highlights.

## Why current flow feels non-live
Current `LiveTutorSession.tsx` + `realtime.py` relies on manual mic toggling and chunk submit (`audio_end`), which creates push-to-talk behavior rather than continuous call interaction.

---

## Recommended Product/Tech Changes

### 1) Replace push-to-talk with continuous streaming + turn detection
**What to do**
- Keep mic open throughout the session (with pause/resume controls).
- Stream small audio frames continuously to backend.
- Use VAD + endpointing to detect child turn end automatically.

**Why**
- MDN constraints support tuning microphone capture quality.
- Turn detection is the core of natural voice UX in agents.

**References**
- MDN Media constraints: `getSupportedConstraints`, `echoCancellation`, `noiseSuppression`, `autoGainControl`.
- LiveKit turn detection docs (VAD + context-aware endpointing).

### 2) Integrate Qurani QRC as primary recitation engine for Quran
**What to do**
- On Quran session start, call Qurani QRC `StartTilawaSession` once.
- While child speaks, stream recitation audio and consume QRC feedback events.
- Keep local matcher as fallback if QRC fails.

**Why**
- Qurani QRC is specialized for real-time recitation correction and tajweed-aware feedback.

### 3) Introduce explicit session phases in backend state
Add state machine in websocket session:
- `tutor_reciting`
- `awaiting_child`
- `child_reciting`
- `feedback`
- `repeat_or_advance`

This prevents overlap and makes behavior predictable (especially interruptions).

### 4) Auto-duck + barge-in handling
**What to do**
- While tutor audio is playing, continue listening at low priority for child speech onset.
- If child starts speaking, duck/stop tutor audio and switch to `child_reciting`.

**Why**
- This is how live call assistants feel responsive.

### 5) Upgrade ayah highlighting from static words to timed reading guidance
**What to do**
- Build event payloads with location IDs (`surah:ayah:word`).
- Emit word timing/status events from backend during child recitation.
- Animate each word state: pending → current → correct/missed.

### 6) Add tajweed overlays per word (phase 2)
Use Qurani API word tajweed by location to fetch rules and annotate highlighted words with compact hints.

### 7) Keep Quran Arabic-only policy end-to-end
- Force Arabic TTS for Quran.
- Force Arabic tutor prompts + correction text.
- Keep UI labels localizable, but Quran coaching text stays Arabic.

---

## Suggested Implementation Plan

### Phase A (1 sprint): Hands-free MVP
- Remove press-to-talk requirement in Quran mode only.
- Continuous mic capture in frontend.
- Backend VAD-based end-of-turn detection.
- Tutor recites then waits automatically for child.

### Phase B (1 sprint): Qurani QRC integration
- Add `qurani_client.py` and provider switch.
- Use QRC for recitation score + correction candidates.
- Fallback to local matcher.

### Phase C (1 sprint): Rich highlighting + tajweed
- Word timing and correctness events.
- Follow-the-ayah animation.
- Tajweed badges/hints per word location.

---

## Concrete code touchpoints in this repo
- `app/src/pages/live/LiveTutorSession.tsx`
  - replace manual `toggleListening` flow for Quran with always-on stream mode
  - preserve manual mode for non-Quran subjects if desired
- `backend/api/realtime.py`
  - add phase machine + continuous audio ingestion + auto turn-close
  - integrate QRC adapter and normalize events
- `backend/services/quran_matcher.py`
  - keep as fallback provider
- `backend/services/tutor_engine.py`
  - expand turn-state model for live call phases

---

## Practical defaults to start with
- Endpointing silence: ~600–900ms for kids (more tolerant pauses).
- Max child turn duration: 8–12s before gentle reprompt.
- Tutor recitation speed: 0.70–0.80 for clear imitation.
- Auto-repeat threshold: if accuracy < 75%, repeat same ayah/segment.

---

## Online sources used
- Qurani QRC docs: https://qurani.ai/en/docs/2-advanced-tools/qrc
- Qurani tajweed-by-location endpoint: https://qurani.ai/en/docs/1-general-apis/word/Get_Tajweed_Rules_by_Location_v1_word_tajweed_get
- MDN Media Capture constraints: https://developer.mozilla.org/en-US/docs/Web/API/Media_Capture_and_Streams_API/Constraints
- MDN Web Speech API usage: https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API.
- LiveKit turn detector docs: https://docs.livekit.io/agents/logic/turns/turn-detector/

