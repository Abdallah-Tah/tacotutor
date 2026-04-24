import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Mic, MicOff, Volume2, VolumeX, Square, Puzzle, ChevronRight } from 'lucide-react'
import { lessonAPI, sessionAPI, userAPI } from '@/services/api'
import { buildWebSocketUrl } from '@/lib/paths'
import { useSessionStore } from '@/stores/sessionStore'
import PuzzleDisplay from '@/components/puzzles/PuzzleDisplay'
import type { Puzzle as PuzzleData, PuzzleResult } from '@/components/puzzles/PuzzleDisplay'
import type { Lesson } from '@/types'

export default function LiveTutorSession() {
  const { childId, lessonId } = useParams()
  const [sessionStarted, setSessionStarted] = useState(false)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState('')
  const [childName, setChildName] = useState('friend')
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0)
  const [speechReady, setSpeechReady] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const lastPromptedAyahRef = useRef<number | null>(null)

  const {
    transcript,
    tutorText,
    isListening,
    isSpeaking,
    highlightedWordIndex,
    wordCorrectness,
    startSession: startStoreSession,
    endSession: endStoreSession,
    setTranscript,
    setTutorText,
    setListening,
    setSpeaking,
    setHighlightedWord,
    setWordCorrectness,
  } = useSessionStore()

  useEffect(() => {
    if (!childId) return

    userAPI.getChild(childId)
      .then((res) => setChildName(res.data?.name || 'friend'))
      .catch(() => setChildName('friend'))
  }, [childId])

  useEffect(() => {
    if (!lessonId) {
      setLesson(null)
      return
    }

    lessonAPI.getPublic(lessonId)
      .then((res) => {
        setLesson(res.data)
        setCurrentAyahIndex(0)
      })
      .catch(() => setLesson(null))
  }, [lessonId])

  useEffect(() => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.getVoices()
  }, [])

  useEffect(() => {
    return () => {
      endStoreSession()
      if (wsRef.current) {
        wsRef.current.close()
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const unlockSpeech = () => {
    if (!('speechSynthesis' in window)) return

    try {
      const synth = window.speechSynthesis
      synth.cancel()
      synth.getVoices()
      synth.resume()
      const primer = new SpeechSynthesisUtterance(' ')
      primer.volume = 0
      synth.speak(primer)
      setSpeechReady(true)
    } catch {
      // ignore browser-specific speech unlock issues
    }
  }

  const startSession = async () => {
    try {
      unlockSpeech()
      setError('')
      const res = await sessionAPI.start(childId!, lessonId)
      const sessionId = res.data.id
      startStoreSession(sessionId, childId!, lessonId)
      lastPromptedAyahRef.current = 0
      setSessionStarted(true)
      connectWebSocket(sessionId)
    } catch (err: any) {
      setError('Failed to start session')
    }
  }

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const playServerAudio = (audioPath: string) => {
    try {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      const baseUrl = window.location.origin
      const audio = new Audio(`${baseUrl}${audioPath}`)
      audioRef.current = audio
      audio.onplay = () => setSpeaking(true)
      audio.onended = () => setSpeaking(false)
      audio.onerror = () => {
        setSpeaking(false)
        // Fallback to browser TTS
        if (tutorText) speakText(tutorText, true)
      }
      audio.play().catch(() => {
        // Autoplay blocked — try after user interaction
        setSpeaking(false)
      })
    } catch {
      // Fallback to browser TTS
      if (tutorText) speakText(tutorText, true)
    }
  }

  const speakText = (text: string, force = false) => {
    if ((!voiceEnabled && !force) || !('speechSynthesis' in window) || !text.trim()) return

    const synth = window.speechSynthesis
    synth.cancel()
    synth.resume()

    const utterance = new SpeechSynthesisUtterance(text)
    const forceArabicVoice = lesson?.subject === 'quran'
    const forceEnglishVoice = lesson?.subject === 'english' || lesson?.subject === 'math'
    const isArabic = forceArabicVoice || (!forceEnglishVoice && /[\u0600-\u06FF]/.test(text))
    const voices = synth.getVoices()

    if (forceArabicVoice || isArabic) {
      // Try Arabic voices in priority order: Saudi, Gulf, Standard, any Arabic
      const arVoice = voices.find((v) => v.lang === 'ar-SA')
        || voices.find((v) => v.lang.startsWith('ar-SA'))
        || voices.find((v) => v.lang.startsWith('ar-AE') || v.lang.startsWith('ar-KW') || v.lang.startsWith('ar-QA') || v.lang.startsWith('ar-BH'))
        || voices.find((v) => v.lang.startsWith('ar-EG'))
        || voices.find((v) => v.lang === 'ar')
        || voices.find((v) => v.lang.startsWith('ar'))
      if (arVoice) {
        utterance.voice = arVoice
      }
      utterance.lang = arVoice?.lang || 'ar-SA'
      utterance.rate = 0.75  // Slower for Quran clarity
      utterance.pitch = 0.9
    } else {
      const enVoice = voices.find((v) => v.lang.startsWith('en-US')) || voices.find((v) => v.lang.startsWith('en'))
      if (enVoice) utterance.voice = enVoice
      utterance.lang = 'en-US'
      utterance.rate = 0.95
      utterance.pitch = 1.0
    }
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => {
      setSpeaking(false)
      if (!speechReady) {
        setError('Tap the speaker button once if iPhone blocks auto audio.')
      }
    }
    synth.speak(utterance)
  }

  const connectWebSocket = (sessionId: string) => {
    const params = new URLSearchParams({ session: sessionId })
    if (lesson?.subject) params.set('subject', lesson.subject)
    const wsUrl = buildWebSocketUrl(`/api/realtime/ws?${params.toString()}`)
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setConnected(true)
      setError('')
      ws.send(JSON.stringify({ type: 'session_start', sessionId, childId, childName, lessonId }))
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleWebSocketMessage(msg)
      } catch (e) {
        console.error('WS message parse error:', e)
      }
    }

    ws.onerror = () => {
      setError('Connection error')
      setConnected(false)
    }

    ws.onclose = () => {
      setConnected(false)
    }
  }

  const lessonTitle = lesson?.content?.surah
    ? `Surah ${lesson.content.surah}`
    : lesson?.title || 'Current Lesson'

  const isQuranSession = lesson?.subject === 'quran'
  const isMathSession = lesson?.subject === 'math'

  const mathMaxCount = (() => {
    if (!isMathSession) return 0
    const rangeText = lesson?.content?.range
    const rangeMatch = typeof rangeText === 'string' ? rangeText.match(/(\d+)\s*-\s*(\d+)/) : null
    if (rangeMatch) return Number(rangeMatch[2])
    const explicitMax = lesson?.content?.max || lesson?.content?.count
    if (typeof explicitMax === 'number') return explicitMax
    return 5
  })()

  const mathObjects = Array.isArray(lesson?.content?.objects) && lesson.content.objects.length > 0
    ? lesson.content.objects
    : ['block', 'chicken', 'star']

  const objectEmojiMap: Record<string, string> = {
    block: '🧱',
    chicken: '🐔',
    star: '⭐',
    apple: '🍎',
    ball: '⚽',
    cube: '🧊',
    car: '🚗',
    duck: '🦆',
    cat: '🐱',
  }

  const countingItems = Array.from({ length: Math.max(mathMaxCount, 0) }, (_, index) => {
    const objectName = String(mathObjects[index % mathObjects.length] || 'block').toLowerCase()
    return {
      id: `${objectName}-${index}`,
      emoji: objectEmojiMap[objectName] || '🔢',
      label: objectName,
    }
  })

  const lessonChunks = Array.isArray(lesson?.content?.ayahs) && lesson?.content?.ayahs.length > 0
    ? lesson.content.ayahs
    : lesson?.content?.letter
    ? [lesson.content.letter]
    : isMathSession && mathMaxCount > 0
    ? [Array.from({ length: mathMaxCount }, (_, i) => i + 1).join(' ')]
    : []

  const displayText = lessonChunks[currentAyahIndex] || (isQuranSession ? 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ' : 'Let’s begin!')
  const words = displayText.split(' ').filter(Boolean)

  useEffect(() => {
    if (!sessionStarted || !connected || !wsRef.current || lessonChunks.length <= 1) return
    if (lastPromptedAyahRef.current === currentAyahIndex) return

    lastPromptedAyahRef.current = currentAyahIndex
    setTutorText('')
    wsRef.current.send(JSON.stringify({ type: 'set_ayah', ayahIndex: currentAyahIndex }))
  }, [connected, currentAyahIndex, lessonChunks.length, sessionStarted, setTutorText])

  const handleWebSocketMessage = (msg: any) => {
    switch (msg.type) {
      case 'session_state':
        setConnected(msg.status === 'connected')
        break
      case 'partial_transcript':
        setTranscript(msg.text)
        setListening(true)
        break
      case 'final_transcript':
        setTranscript(msg.text)
        setListening(false)
        break
      case 'assistant_token':
        setTutorText((prev) => prev + msg.token)
        break
      case 'assistant_sentence':
        if (typeof msg.ayahIndex === 'number') {
          setCurrentAyahIndex(msg.ayahIndex)
          lastPromptedAyahRef.current = msg.ayahIndex
        }
        setTutorText(msg.text)
        // Play server-generated audio if available, fallback to browser TTS
        if (msg.audio && voiceEnabled) {
          playServerAudio(msg.audio)
        } else {
          speakText(msg.text)
        }
        break
      case 'word_highlight':
        setHighlightedWord(msg.wordIndex, msg.correct)
        break
      case 'matching_result':
        if (msg.mistakes) {
          setWordCorrectness(msg.mistakes.map((m: any) => !m.incorrect))
        }
        break
      case 'transcription':
        setTranscript(msg.text)
        setListening(false)
        break
      case 'processing':
        setProcessing(true)
        setTutorText(msg.message || (isQuranSession ? 'جاري التحليل...' : 'Analyzing your answer...'))
        break
      case 'recitation_feedback':
        setProcessing(false)
        if (typeof msg.accuracy === 'number') {
          setRecitationAccuracy(msg.accuracy)
        }
        // Update word-level correctness display
        if (msg.correct_words || msg.missed_words) {
          const correctness: Record<number, boolean> = {}
          const targetWords = words
          const correctSet = new Set(msg.correct_words || [])
          const missedSet = new Set(msg.missed_words || [])
          targetWords.forEach((w: string, i: number) => {
            if (missedSet.has(w)) correctness[i] = false
            else if (correctSet.has(w)) correctness[i] = true
          })
          setWordCorrectness(Object.values(correctness))
        }
        break
      case 'puzzle_mode_changed':
        setPuzzleMode(msg.enabled)
        if (!msg.enabled) {
          setCurrentPuzzle(null)
          setPuzzleResult(null)
          setPuzzleHint(null)
          setPuzzleHintNum(0)
        }
        break
      case 'puzzle_start':
        setCurrentPuzzle(msg.puzzle as PuzzleData)
        setPuzzleResult(null)
        setPuzzleHint(null)
        setPuzzleHintNum(0)
        if (msg.audio && voiceEnabled) playServerAudio(msg.audio)
        break
      case 'puzzle_result':
        setPuzzleResult(msg as PuzzleResult)
        setProcessing(false)
        if (msg.audio && voiceEnabled) playServerAudio(msg.audio)
        break
      case 'puzzle_hint':
        setPuzzleHint(msg.hint)
        setPuzzleHintNum(msg.hint_num)
        if (msg.audio && voiceEnabled) playServerAudio(msg.audio)
        break
      case 'turn_complete':
        setSpeaking(false)
        setProcessing(false)
        break
      case 'error':
        setError(msg.message)
        break
    }
  }

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const [processing, setProcessing] = useState(false)
  const [recitationAccuracy, setRecitationAccuracy] = useState(0)

  // Puzzle mode state
  const [puzzleMode, setPuzzleMode] = useState(false)
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData | null>(null)
  const [puzzleResult, setPuzzleResult] = useState<PuzzleResult | null>(null)
  const [puzzleHint, setPuzzleHint] = useState<string | null>(null)
  const [puzzleHintNum, setPuzzleHintNum] = useState(0)

  const toggleListening = () => {
    if (!wsRef.current || !connected) return

    if (isListening) {
      // Stop recording and send audio
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      setListening(false)
    } else {
      // Start recording
      setProcessing(false)
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
          mediaRecorderRef.current = mediaRecorder
          audioChunksRef.current = []

          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data)
            }
          }

          mediaRecorder.onstop = async () => {
            // Stop all tracks
            stream.getTracks().forEach((t) => t.stop())

            if (audioChunksRef.current.length === 0 || !wsRef.current) return

            // Combine and send as base64
            const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
            const reader = new FileReader()
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1]
              if (base64 && wsRef.current) {
                wsRef.current.send(JSON.stringify({ type: 'audio_chunk', data: base64 }))
                // Include puzzle_id so the server grades it as a puzzle answer
                const audioEndMsg: Record<string, string> = { type: 'audio_end' }
                if (puzzleMode && currentPuzzle) {
                  audioEndMsg.puzzle_id = currentPuzzle.id
                }
                wsRef.current.send(JSON.stringify(audioEndMsg))
                setProcessing(true)
              }
            }
            reader.readAsDataURL(blob)
          }

          mediaRecorder.start(500) // collect every 500ms
          setListening(true)
          setTutorText('')
        })
        .catch((err) => {
          console.error('Mic error:', err)
          setError('Microphone access denied. Please allow mic access.')
        })
    }
  }

  const endSession = async () => {
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'session_end' }))
      wsRef.current.close()
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    lastPromptedAyahRef.current = null
    endStoreSession()
    setSessionStarted(false)
    setConnected(false)
  }

  const togglePuzzleMode = () => {
    if (!wsRef.current || !connected) return
    const nextEnabled = !puzzleMode
    wsRef.current.send(JSON.stringify({ type: 'puzzle_toggle', enabled: nextEnabled }))
  }

  const requestNextPuzzle = () => {
    if (!wsRef.current || !connected) return
    setPuzzleResult(null)
    setPuzzleHint(null)
    setPuzzleHintNum(0)
    wsRef.current.send(JSON.stringify({ type: 'puzzle_next' }))
  }

  const requestHint = () => {
    if (!wsRef.current || !connected || !currentPuzzle) return
    wsRef.current.send(JSON.stringify({ type: 'puzzle_hint' }))
  }

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      {/* Header */}
      <div className="glass-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={`/kid/${childId}`} className="p-2 rounded-xl hover:bg-dark-card-hover transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold">Live Tutor Session</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-success animate-pulse' : 'bg-muted'}`} />
              <span className="text-xs text-muted">{connected ? 'Connected' : 'Not connected'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {sessionStarted && (
            <button
              onClick={togglePuzzleMode}
              title={puzzleMode ? 'Exit puzzle mode' : 'Start puzzle mode'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-all ${
                puzzleMode
                  ? 'bg-primary text-white shadow-lg shadow-primary/30'
                  : 'bg-dark-input hover:bg-dark-card-hover text-muted'
              }`}
            >
              <Puzzle size={15} />
              {puzzleMode ? 'Puzzles ON' : 'Puzzles'}
            </button>
          )}
          <button
            onClick={() => {
              const next = !voiceEnabled
              setVoiceEnabled(next)
              if (next) {
                unlockSpeech()
                if (tutorText) speakText(tutorText, true)
              }
            }}
            className="p-2 rounded-xl bg-dark-input hover:bg-dark-card-hover transition-colors"
            title={voiceEnabled ? 'Mute tutor voice' : 'Enable tutor voice'}
          >
            {voiceEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={endSession}
            className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <Square size={18} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left: Tutor Avatar & Transcript */}
        <div className="w-80 glass-card border-r border-border flex flex-col">
          <div className="flex-1 p-6 flex flex-col items-center justify-center">
            <motion.div
              animate={isSpeaking ? { scale: [1, 1.05, 1] } : {}}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-6xl shadow-lg shadow-primary/30 mb-6"
            >
              🌮
            </motion.div>

            <AnimatePresence mode="wait">
              {tutorText && (
                <motion.div
                  key={tutorText}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <p className="text-lg font-semibold mb-3">{tutorText}</p>
                  <button
                    onClick={() => speakText(tutorText, true)}
                    className="btn-secondary text-sm inline-flex items-center gap-2"
                  >
                    <Volume2 size={16} />
                    Hear Tutor
                  </button>
                  <p className="text-xs text-muted mt-2">If iPhone blocks auto audio, tap once.</p>
                </motion.div>
              )}
            </AnimatePresence>

            {isSpeaking && !tutorText && (
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    className="w-1 h-6 bg-primary rounded-full"
                    animate={{ scaleY: [0.5, 1, 0.5] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Transcript */}
          <div className="border-t border-border p-4">
            <p className="text-xs text-muted uppercase tracking-wider mb-2">Your Speech</p>
            <div className="min-h-[60px] p-3 rounded-xl bg-dark-input">
              {transcript ? (
                <p className="text-sm">{transcript}</p>
              ) : (
                <p className="text-sm text-muted italic">{isListening ? 'Listening...' : 'Press the mic to speak'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Center: Quran Display */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {!sessionStarted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-5xl mx-auto mb-6 shadow-lg shadow-primary/30">
                🕌
              </div>
              <h2 className="text-2xl font-black mb-2">Ready to Learn?</h2>
              <p className="text-muted mb-6 max-w-md">
                Start a live tutoring session where the AI tutor will listen to your recitation,
                provide real-time feedback, and guide you through the lesson.
              </p>
              <button onClick={startSession} className="btn-primary text-lg px-8 py-4">
                Start Live Session
              </button>
              {error && <p className="text-sm text-secondary mt-4">{error}</p>}
            </motion.div>
          ) : (
            <div className="w-full max-w-3xl">
              {/* ── Puzzle mode ─────────────────────────────────────────── */}
              <AnimatePresence mode="wait">
                {puzzleMode && currentPuzzle ? (
                  <motion.div
                    key="puzzle-view"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <PuzzleDisplay
                      puzzle={currentPuzzle}
                      result={puzzleResult}
                      onHint={requestHint}
                      hint={puzzleHint}
                      hintNum={puzzleHintNum}
                    />

                    {/* After result: Next Puzzle button */}
                    {puzzleResult && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 flex justify-center"
                      >
                        <button
                          onClick={requestNextPuzzle}
                          className="btn-primary flex items-center gap-2"
                        >
                          Next Puzzle <ChevronRight size={16} />
                        </button>
                      </motion.div>
                    )}
                  </motion.div>
                ) : puzzleMode ? (
                  <motion.div
                    key="puzzle-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-card rounded-3xl p-12 text-center"
                  >
                    <div className="text-5xl mb-4 animate-bounce">🎯</div>
                    <p className="text-lg font-semibold">Loading your puzzle…</p>
                  </motion.div>
                ) : (
                  /* ── Free-talk mode (original) ─────────────────────── */
                  <motion.div
                    key="free-talk"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="glass-card rounded-3xl p-8 sm:p-12 text-center">
                      {error && <p className="text-sm text-secondary mb-4">{error}</p>}
                      <p className="text-sm text-muted uppercase tracking-widest mb-2">{lessonTitle}</p>
                      {lessonChunks.length > 1 && (
                        <p className="text-xs text-muted mb-6">Ayah {currentAyahIndex + 1} of {lessonChunks.length}</p>
                      )}

                      <div className={`${isQuranSession ? 'arabic' : ''} text-4xl sm:text-5xl lg:text-6xl leading-loose`}>
                        {words.map((word: string, i: number) => (
                          <motion.span
                            key={i}
                            className={`inline-block mx-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                              highlightedWordIndex === i
                                ? 'bg-primary/30 text-primary-light scale-110'
                                : wordCorrectness[i] === true
                                ? 'text-success'
                                : wordCorrectness[i] === false
                                ? 'text-secondary'
                                : ''
                            }`}
                            animate={
                              highlightedWordIndex === i
                                ? { scale: [1, 1.1, 1], y: [0, -4, 0] }
                                : {}
                            }
                            transition={{ duration: 0.5 }}
                          >
                            {word}
                          </motion.span>
                        ))}
                      </div>

                      {isMathSession && countingItems.length > 0 && (
                        <div className="mt-8">
                          <p className="text-sm text-muted mb-4">Count the objects one by one:</p>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 justify-items-center">
                            {countingItems.map((item, index) => (
                              <motion.div
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.6, y: 12 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                transition={{ delay: index * 0.08, duration: 0.3 }}
                                className="w-16 h-16 rounded-2xl bg-dark-input border border-border flex flex-col items-center justify-center"
                                title={item.label}
                              >
                                <span className="text-2xl">{item.emoji}</span>
                                <span className="text-xs text-muted">{index + 1}</span>
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {lessonChunks.length > 1 && (
                        <div className="mt-6">
                          <div className="flex flex-wrap justify-center gap-2">
                            {lessonChunks.map((_: string, index: number) => (
                              <button
                                key={index}
                                onClick={() => setCurrentAyahIndex(index)}
                                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                                  currentAyahIndex === index
                                    ? 'bg-primary text-white'
                                    : 'bg-dark-input text-muted hover:bg-dark-card-hover'
                                }`}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>
                          <div className="mt-4 flex justify-center gap-3">
                            <button
                              onClick={() => setCurrentAyahIndex((prev) => Math.max(0, prev - 1))}
                              disabled={currentAyahIndex === 0}
                              className="btn-secondary disabled:opacity-40"
                            >
                              Previous Ayah
                            </button>
                            <button
                              onClick={() => setCurrentAyahIndex((prev) => Math.min(lessonChunks.length - 1, prev + 1))}
                              disabled={currentAyahIndex >= lessonChunks.length - 1}
                              className="btn-primary disabled:opacity-40"
                            >
                              Next Ayah
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Puzzle mode CTA when no puzzle active */}
                      {sessionStarted && !puzzleMode && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 1 }}
                          className="mt-8 flex justify-center"
                        >
                          <button
                            onClick={togglePuzzleMode}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-all text-sm font-semibold"
                          >
                            <Puzzle size={15} /> Try Puzzle Mode
                          </button>
                        </motion.div>
                      )}

                      {isListening && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="mt-8 flex justify-center"
                        >
                          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/20 text-secondary">
                            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                            <span className="text-sm font-semibold">Listening...</span>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Control Bar — always visible during active session */}
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={toggleListening}
                  disabled={processing}
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-50 ${
                    processing
                      ? 'bg-yellow-500 shadow-yellow-500/30'
                      : isListening
                      ? 'bg-secondary shadow-secondary/30 animate-pulse'
                      : 'bg-gradient-to-br from-primary to-secondary shadow-primary/30 hover:scale-105'
                  }`}
                >
                  {processing ? <span className="text-lg">⏳</span> : isListening ? <MicOff size={28} /> : <Mic size={28} />}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right: Feedback Panel */}
        <div className="w-72 glass-card border-l border-border p-4">
          <h3 className="font-bold mb-4">Live Feedback</h3>

          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-dark-input">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Session</p>
              <p className="text-sm font-semibold">{sessionStarted ? 'Active' : 'Not started'}</p>
            </div>

            <div className="p-3 rounded-xl bg-dark-input">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Status</p>
              <p className="text-sm font-semibold">
                {processing ? 'تحليل...' : isSpeaking ? 'Tutor speaking' : isListening ? 'Listening' : 'Idle'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-dark-input">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Accuracy</p>
              <div className="w-full h-2 bg-dark-card rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: `${recitationAccuracy}%` }} />
              </div>
              <p className="text-sm font-semibold mt-1">{recitationAccuracy}%</p>
            </div>

            <div className="p-3 rounded-xl bg-dark-input">
              <p className="text-xs text-muted uppercase tracking-wider mb-1">Words</p>
              <div className="flex gap-1 flex-wrap">
                {words.map((_: string, i: number) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full ${
                      wordCorrectness[i] === true
                        ? 'bg-success'
                        : wordCorrectness[i] === false
                        ? 'bg-secondary'
                        : 'bg-dark-card'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
