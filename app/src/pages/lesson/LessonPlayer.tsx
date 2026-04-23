import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Play, Pause, RotateCcw, Volume2, BookOpen } from 'lucide-react'
import { lessonAPI, sessionAPI } from '@/services/api'
import type { Lesson } from '@/types'

// Quran text data (embedded for offline use, fallback from API)
const QURAN_TEXT: Record<string, string[]> = {
  '1': [ // Al-Fatiha
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
    'الرَّحْمَٰنِ الرَّحِيمِ',
    'مَالِكِ يَوْمِ الدِّينِ',
    'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
    'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
    'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
  ],
  '112': [ // Al-Ikhlas
    'قُلْ هُوَ اللَّهُ أَحَدٌ',
    'اللَّهُ الصَّمَدُ',
    'لَمْ يَلِدْ وَلَمْ يُولَدْ',
    'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ',
  ],
  '113': [ // Al-Falaq
    'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
    'مِنْ شَرِّ مَا خَلَقَ',
    'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ',
    'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ',
    'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ',
  ],
  '114': [ // An-Nas
    'قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
    'مَلِكِ النَّاسِ',
    'إِلَٰهِ النَّاسِ',
    'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ',
    'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ',
    'مِنَ الْجِنَّةِ وَالنَّاسِ',
  ],
}

const SURAH_NAMES: Record<string, string> = {
  '1': 'Al-Fatiha',
  '112': 'Al-Ikhlas',
  '113': 'Al-Falaq',
  '114': 'An-Nas',
}

export default function LessonPlayer() {
  const { childId, lessonId } = useParams()
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [currentAyah, setCurrentAyah] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [highlightedWord, setHighlightedWord] = useState<number | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (lessonId) {
      loadLesson()
    } else {
      setLoading(false)
    }
  }, [lessonId])

  const loadLesson = async () => {
    try {
      const res = await lessonAPI.get(lessonId!)
      setLesson(res.data)

      // Start session
      if (childId) {
        const sessionRes = await sessionAPI.start(childId, lessonId)
        setSessionId(sessionRes.data.id)
      }
    } catch (err) {
      console.error('Failed to load lesson:', err)
    } finally {
      setLoading(false)
    }
  }

  const getAyahs = () => {
    if (!lesson) return []
    const content = lesson.content
    if (content.surah && QURAN_TEXT[content.surah]) {
      return QURAN_TEXT[content.surah]
    }
    return content.ayahs || []
  }

  const handlePlay = () => {
    setIsPlaying(!isPlaying)
    // Simulate word highlighting
    if (!isPlaying) {
      let wordIndex = 0
      const interval = setInterval(() => {
        setHighlightedWord(wordIndex)
        wordIndex++
        if (wordIndex > 10) {
          clearInterval(interval)
          setHighlightedWord(null)
          setIsPlaying(false)
        }
      }, 800)
    }
  }

  const handleNextAyah = () => {
    const ayahs = getAyahs()
    if (currentAyah < ayahs.length - 1) {
      setCurrentAyah(currentAyah + 1)
      setHighlightedWord(null)
    }
  }

  const handlePrevAyah = () => {
    if (currentAyah > 0) {
      setCurrentAyah(currentAyah - 1)
      setHighlightedWord(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen size={48} className="mx-auto mb-4 text-muted" />
          <p className="text-muted mb-4">No lesson selected</p>
          <Link to="/lessons" className="btn-primary">Browse Lessons</Link>
        </div>
      </div>
    )
  }

  const ayahs = getAyahs()
  const currentText = ayahs[currentAyah] || ''
  const words = currentText.split(' ')

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to={`/kid/${childId}`} className="p-2 rounded-xl hover:bg-dark-card-hover transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black">{lesson.title}</h1>
            <p className="text-sm text-muted">Ayah {currentAyah + 1} of {ayahs.length}</p>
          </div>
        </div>

        {/* Quran Display */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl p-8 sm:p-12 mb-8"
        >
          <div className="text-center mb-8">
            <p className="text-sm text-muted uppercase tracking-widest mb-4">
              {SURAH_NAMES[lesson.content.surah] || lesson.title}
            </p>

            {/* Arabic Text with Word Highlighting */}
            <div className="arabic text-3xl sm:text-4xl lg:text-5xl leading-loose">
              {words.map((word: string, i: number) => (
                <motion.span
                  key={i}
                  className={`inline-block mx-1 px-2 py-1 rounded-xl transition-all duration-300 ${
                    highlightedWord === i
                      ? 'bg-primary/30 text-primary-light scale-110'
                      : highlightedWord !== null && i < (highlightedWord || 0)
                      ? 'text-success'
                      : ''
                  }`}
                  animate={
                    highlightedWord === i
                      ? { scale: [1, 1.1, 1], y: [0, -4, 0] }
                      : {}
                  }
                  transition={{ duration: 0.5 }}
                >
                  {word}
                </motion.span>
              ))}
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handlePrevAyah}
              disabled={currentAyah === 0}
              className="p-3 rounded-xl bg-dark-card hover:bg-dark-card-hover transition-colors disabled:opacity-30"
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={handlePlay}
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white shadow-lg shadow-primary/30 hover:scale-105 transition-transform"
            >
              {isPlaying ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>

            <button
              onClick={handleNextAyah}
              disabled={currentAyah >= ayahs.length - 1}
              className="p-3 rounded-xl bg-dark-card hover:bg-dark-card-hover transition-colors disabled:opacity-30"
            >
              <Volume2 size={20} />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mt-8">
            <div className="w-full h-2 bg-dark-input rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
                style={{ width: `${((currentAyah + 1) / ayahs.length) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted">
              <span>Start</span>
              <span>{Math.round(((currentAyah + 1) / ayahs.length) * 100)}%</span>
              <span>Complete</span>
            </div>
          </div>
        </motion.div>

        {/* Ayah Navigator */}
        <div className="grid grid-cols-7 sm:grid-cols-10 gap-2">
          {ayahs.map((_: string, i: number) => (
            <button
              key={i}
              onClick={() => {
                setCurrentAyah(i)
                setHighlightedWord(null)
              }}
              className={`aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                i === currentAyah
                  ? 'bg-primary text-white'
                  : i < currentAyah
                  ? 'bg-success/20 text-success'
                  : 'bg-dark-card text-muted hover:bg-dark-card-hover'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
