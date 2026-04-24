# Qurani.ai Integration Recommendations for Quran Session (Animation + Reading Coach)

## Current State (What TacoTutor already does)

- Live Quran sessions stream mic audio to `backend/api/realtime.py` and return:
  - transcription
  - simple word matching (`_compare_recitation`)
  - tutor feedback + TTS. 
- Frontend (`app/src/pages/live/LiveTutorSession.tsx`) already highlights words and tracks `highlightedWordIndex` + `wordCorrectness`.
- Backend uses custom heuristic comparison and does **not** yet use Qurani.ai’s dedicated recitation corrector.

## Main Gaps

1. **Recitation scoring quality**: Current scoring is simple exact-word look-ahead, not tajweed-aware.
2. **Word/phoneme timing**: No precise timing map from recitation to ayah words.
3. **Quran animation depth**: Highlight exists, but no synchronized “follow-along” timeline or tajweed-rule animation.
4. **Quran-only agent behavior**: Tutor guidance is good, but correction loop can be more deterministic and less LLM-only.

## Recommended Target Architecture

### 1) Keep TacoTutor WebSocket as the orchestration layer
Use your existing `/api/realtime/ws` endpoint as the single client entrypoint.

Inside backend, add a Qurani adapter service:
- `backend/services/qurani_client.py`
- responsibilities:
  - start Qurani tilawa session (QRC)
  - stream/submit audio chunks
  - parse feedback events
  - normalize into TacoTutor event schema

This avoids frontend lock-in and lets you fall back to your local matcher when Qurani is unavailable.

### 2) Introduce provider strategy for Quran matching
Add a provider switch in config/env:
- `QURAN_MATCH_PROVIDER=local|qurani`
- `QURANI_API_KEY=...`

Flow:
- `local` => current `_compare_recitation` / `QuranMatcher`
- `qurani` => Qurani QRC events/results
- If Qurani fails/timeouts, auto-fallback to local.

### 3) Upgrade WS event contract for animated reading
Add structured events from backend to frontend:
- `quran_word_timing`
- `quran_word_feedback`
- `quran_tajweed_hint`
- `quran_line_progress`

Payload should include stable identifiers:
- `location: "surah:ayah:wordIndex"`
- `status: correct|missed|extra|repeat`
- `confidence`
- `rule` (if tajweed applicable)

Frontend then animates word-by-word with deterministic state, not only inferred text matching.

### 4) Build “Follow-the-Ayah” animation mode
In `LiveTutorSession.tsx`, for Quran sessions:
- Keep current word chips.
- Add timeline animation:
  - idle: muted
  - current target word: pulse glow
  - correct: green settle animation
  - missed: amber shake + retry badge
- Optional: line guide bar progressing over words.

This creates the “Synthesis-like” guided feeling while staying Quran-appropriate.

### 5) Add Tajweed overlays (phased)
Use Qurani general API endpoints (word tajweed by location) to prefetch per-word tajweed metadata for current ayah.

Render:
- small color underline / badge per word
- tap/hover tooltip in Arabic: short hint (e.g. ghunnah, madd)

Keep this **optional** and beginner-safe (default simple mode ON, advanced mode toggle).

### 6) Make Quran tutor agent deterministic for correction turns
Current feedback uses a general prompt to generate one sentence. Keep it, but anchor with structured data:
- pass `{missed_words, extra_words, accuracy, current_ayah}`
- force response template for correction turns:
  - praise
  - one correction point
  - next repeat instruction

This reduces hallucinations and keeps pedagogical consistency.

## Suggested Incremental Delivery Plan

### Phase 1 (Fastest impact)
- Add provider abstraction + Qurani client scaffold.
- Integrate Qurani QRC for recitation feedback only.
- Map Qurani feedback to existing `recitation_feedback` event.

### Phase 2 (Animation)
- Add new WS events for word timing/status.
- Implement follow-the-ayah animation in frontend.

### Phase 3 (Tajweed coaching)
- Fetch tajweed rules by location and overlay hints.
- Add “Beginner / Tajweed+” mode toggle.

### Phase 4 (Teacher quality)
- Harden Quran feedback templates and multilingual policy (Arabic-only for Quran).
- Add analytics for retry counts per word/rule.

## Concrete Code Touchpoints

- Backend orchestration: `backend/api/realtime.py`
- Local matcher (fallback): `backend/services/quran_matcher.py`
- Session loop state model: `backend/services/tutor_engine.py`
- Frontend Quran interaction + highlights: `app/src/pages/live/LiveTutorSession.tsx`
- Env/config plumbing: `backend/core/config.py` (+ deployment secrets)

## Recommendation Summary

If your goal is “Quran session with strong animation + accurate reading correction,” the best path is:

1. **Integrate Qurani QRC first** for reliable recitation intelligence.
2. **Keep TacoTutor WS as your stable API** and map Qurani responses into your own events.
3. **Enhance frontend with timed word animation + tajweed overlays** using those events.
4. **Retain local matcher as fallback** to keep sessions resilient.

This gives you immediate quality gains while preserving your current architecture and UI velocity.
