"""
TacoTutor — Pipecat real-time voice pipeline.
Connects MacBook mic → STT → LLM → TTS → speakers via Pipecat.

Usage:
    python voice.py                     # Start voice session
    python voice.py --subject english   # Specific subject
    python voice.py --child Ali         # Load child's progress
"""

import asyncio
import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from bot import TacoTutorAgent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(name)s] %(message)s")
log = logging.getLogger("tacotutor.voice")


async def run_voice(subject: str, child_name: str):
    """Run the real-time voice pipeline using Pipecat."""
    try:
        from pipecat.frames.frames import (
            AudioRawFrame,
            TranscriptionFrame,
            LLMMessagesFrame,
            TextFrame,
            TTSAudioRawFrame,
        )
        from pipecat.pipeline.pipeline import Pipeline
        from pipecat.pipeline.runner import PipelineRunner
        from pipecat.pipeline.task import PipelineParams, PipelineTask
        from pipecat.services.deepgram import DeepgramSTTService
        from pipecat.transports.services.daily import DailyParams
    except ImportError:
        log.error("Pipecat not installed. Run: pip install pipecat-ai")
        log.error("Falling back to text mode.")
        agent = TacoTutorAgent(subject=subject, child_name=child_name, text_mode=True)
        await agent.text_chat()
        return

    agent = TacoTutorAgent(subject=subject, child_name=child_name)

    # TODO: Configure Pipecat pipeline with:
    # - LocalAudioTransport (MacBook mic + speakers)
    # - STT service (faster-whisper or Deepgram)
    # - LLM service (via agent.llm)
    # - TTS service (Edge-TTS or Gemini TTS)
    # - VAD (Silero for detecting speech start/end)
    #
    # The pipeline flow:
    # Mic → VAD → STT → LLM → TTS → Speaker
    #
    # Phase 1: Get basic audio I/O working
    # Phase 2: Add curriculum integration
    # Phase 3: Add interruption handling

    log.info("Voice pipeline initialized — coming in next commit!")


async def main():
    parser = argparse.ArgumentParser(description="TacoTutor Voice Pipeline")
    parser.add_argument("--subject", default="quran", choices=["quran", "english", "math"])
    parser.add_argument("--child", default="student", help="Child's name")
    args = parser.parse_args()

    await run_voice(args.subject, args.child)


if __name__ == "__main__":
    asyncio.run(main())
