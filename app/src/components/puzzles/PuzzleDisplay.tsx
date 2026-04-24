import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, CheckCircle, XCircle } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Puzzle {
  id: string
  type: 'recitation' | 'fill_blank' | 'word_order' | 'count' | 'add' | 'subtract'
  subject: 'quran' | 'math'
  prompt_ar?: string
  prompt_en?: string
  display_text?: string
  display_words?: string[]
  display_count?: number
  display_emoji?: string
  display_object?: string
  operand_a?: number
  operand_b?: number
  operation?: string
  expected_answer?: string
  full_text?: string
  blank_index?: number
}

export interface PuzzleResult {
  is_correct: boolean
  accuracy: number
  encouragement: string
  details: Record<string, unknown>
}

interface PuzzleDisplayProps {
  puzzle: Puzzle
  result: PuzzleResult | null
  onHint: () => void
  hint: string | null
  hintNum: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<Puzzle['type'], string> = {
  recitation: '🎤 Recitation',
  fill_blank: '✏️ Fill the Blank',
  word_order: '🔀 Word Order',
  count:      '🔢 Count',
  add:        '➕ Addition',
  subtract:   '➖ Subtraction',
}

const TYPE_COLORS: Record<Puzzle['type'], string> = {
  recitation: 'from-purple-500 to-indigo-500',
  fill_blank: 'from-amber-500 to-orange-500',
  word_order: 'from-cyan-500 to-blue-500',
  count:      'from-green-500 to-emerald-500',
  add:        'from-pink-500 to-rose-500',
  subtract:   'from-red-500 to-orange-500',
}

const STAR_POSITIONS = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: Math.cos((i / 16) * Math.PI * 2) * (60 + Math.random() * 50),
  y: Math.sin((i / 16) * Math.PI * 2) * (60 + Math.random() * 50),
  delay: i * 0.04,
  emoji: ['⭐', '✨', '🌟', '💫'][i % 4],
}))

// Stagger container for emoji objects
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.10, delayChildren: 0.1 } },
}
const itemVariants = {
  hidden: { scale: 0, rotate: -20, opacity: 0 },
  show:   { scale: 1, rotate: 0,  opacity: 1, transition: { type: 'spring' as const, stiffness: 220, damping: 15 } },
}

// ─── Sub-renderers ────────────────────────────────────────────────────────────

function RecitationContent({ puzzle }: { puzzle: Puzzle }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        className="text-5xl"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ repeat: Infinity, duration: 2.2 }}
      >
        🎤
      </motion.div>
      <p
        className="text-3xl sm:text-4xl leading-loose text-center arabic font-bold"
        dir="rtl"
      >
        {puzzle.display_text}
      </p>
      <p className="text-sm text-muted italic">Listen, then press the mic and repeat</p>
    </div>
  )
}

function FillBlankContent({ puzzle }: { puzzle: Puzzle }) {
  const words = (puzzle.display_text || '').split(' ')
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="arabic text-3xl sm:text-4xl leading-loose text-center" dir="rtl">
        {words.map((word, i) =>
          word === '___' ? (
            <motion.span
              key={i}
              className="inline-block mx-2 px-6 py-1 rounded-xl border-2 border-dashed border-primary text-primary min-w-[80px] text-center"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
            >
              ?
            </motion.span>
          ) : (
            <span key={i} className="inline-block mx-1">{word}</span>
          )
        )}
      </div>
      <p className="text-sm text-muted italic">Press the mic and say the missing word</p>
    </div>
  )
}

function WordOrderContent({ puzzle }: { puzzle: Puzzle }) {
  const words = puzzle.display_words || []
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap justify-center gap-3" dir="rtl">
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            className="px-4 py-2 rounded-xl bg-dark-input border border-border arabic text-2xl cursor-default select-none"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ scale: 1.05 }}
          >
            {word}
          </motion.span>
        ))}
      </div>
      <p className="text-sm text-muted italic">Press the mic and say the words in the right order</p>
    </div>
  )
}

function CountContent({ puzzle }: { puzzle: Puzzle }) {
  const count = puzzle.display_count ?? 0
  const emoji = puzzle.display_emoji ?? '⭐'
  const items = Array.from({ length: count })
  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        className="grid gap-3 justify-items-center"
        style={{ gridTemplateColumns: `repeat(${Math.min(count, 5)}, 1fr)` }}
        variants={gridVariants}
        initial="hidden"
        animate="show"
      >
        {items.map((_, i) => (
          <motion.div
            key={i}
            variants={itemVariants}
            className="w-14 h-14 rounded-2xl bg-dark-input border border-border flex flex-col items-center justify-center"
          >
            <span className="text-2xl">{emoji}</span>
            <span className="text-[10px] text-muted leading-none mt-0.5">{i + 1}</span>
          </motion.div>
        ))}
      </motion.div>
      <p className="text-sm text-muted italic">Count out loud then press the mic!</p>
    </div>
  )
}

function AddContent({ puzzle }: { puzzle: Puzzle }) {
  const a = puzzle.operand_a ?? 0
  const b = puzzle.operand_b ?? 0
  const emoji = puzzle.display_emoji ?? '⭐'
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-4 flex-wrap justify-center">
        {/* Group A */}
        <motion.div className="flex flex-wrap gap-2 max-w-[160px] justify-center" variants={gridVariants} initial="hidden" animate="show">
          {Array.from({ length: a }).map((_, i) => (
            <motion.span key={i} variants={itemVariants} className="text-3xl">{emoji}</motion.span>
          ))}
        </motion.div>
        {/* Plus sign */}
        <motion.div
          className="text-4xl font-bold text-success"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
        >
          +
        </motion.div>
        {/* Group B */}
        <motion.div className="flex flex-wrap gap-2 max-w-[160px] justify-center" variants={gridVariants} initial="hidden" animate="show">
          {Array.from({ length: b }).map((_, i) => (
            <motion.span key={i} variants={itemVariants} style={{ transitionDelay: `${(a + i) * 0.10}s` }} className="text-3xl">{emoji}</motion.span>
          ))}
        </motion.div>
        {/* Equals + blank */}
        <motion.div
          className="text-4xl font-bold text-muted"
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          =
        </motion.div>
        <motion.div
          className="w-14 h-14 rounded-2xl border-2 border-dashed border-primary flex items-center justify-center text-2xl text-primary font-bold"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          ?
        </motion.div>
      </div>
      <p className="text-sm text-muted italic">Say the total number out loud!</p>
    </div>
  )
}

function SubtractContent({ puzzle }: { puzzle: Puzzle }) {
  const a = puzzle.operand_a ?? 0
  const b = puzzle.operand_b ?? 0
  const emoji = puzzle.display_emoji ?? '⭐'
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex flex-wrap gap-2 justify-center max-w-xs">
        {Array.from({ length: a }).map((_, i) => (
          <motion.span
            key={i}
            variants={itemVariants}
            initial="hidden"
            animate="show"
            transition={{ delay: i * 0.09 }}
            className={`text-3xl relative ${i < a - b ? '' : 'opacity-30 line-through'}`}
          >
            {emoji}
          </motion.span>
        ))}
      </div>
      <div className="flex items-center gap-3 text-3xl font-bold">
        <span className="text-white">{a}</span>
        <span className="text-secondary">−</span>
        <span className="text-secondary">{b}</span>
        <span className="text-muted">=</span>
        <motion.span
          className="w-12 h-12 rounded-xl border-2 border-dashed border-primary flex items-center justify-center text-primary"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          ?
        </motion.span>
      </div>
      <p className="text-sm text-muted italic">Say how many are left!</p>
    </div>
  )
}

// ─── Star burst animation ─────────────────────────────────────────────────────

function StarBurst() {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      {STAR_POSITIONS.map((s) => (
        <motion.div
          key={s.id}
          className="absolute text-xl select-none"
          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
          animate={{ x: s.x, y: s.y, scale: [0, 1.3, 0], opacity: [1, 1, 0] }}
          transition={{ duration: 0.9, delay: s.delay, ease: 'easeOut' }}
        >
          {s.emoji}
        </motion.div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PuzzleDisplay({ puzzle, result, onHint, hint, hintNum }: PuzzleDisplayProps) {
  const gradient = TYPE_COLORS[puzzle.type] ?? 'from-primary to-secondary'
  const label    = TYPE_LABELS[puzzle.type] ?? 'Puzzle'
  const prompt   = puzzle.subject === 'quran' ? puzzle.prompt_ar : puzzle.prompt_en

  const shakeVariants = result && !result.is_correct
    ? { x: [-8, 8, -6, 6, -4, 4, 0], transition: { duration: 0.5 } }
    : {}

  return (
    <motion.div
      key={puzzle.id}
      initial={{ opacity: 0, scale: 0.92, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0, ...shakeVariants }}
      exit={{ opacity: 0, scale: 0.88 }}
      transition={{ duration: 0.35, type: 'spring', stiffness: 220 }}
      className="relative w-full max-w-2xl mx-auto"
    >
      {/* Gradient border card */}
      <div className={`p-[2px] rounded-3xl bg-gradient-to-br ${gradient}`}>
        <div className="bg-dark-bg rounded-[22px] p-6 sm:p-8">

          {/* Type badge */}
          <div className="flex items-center justify-between mb-5">
            <span className={`text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r ${gradient} text-white`}>
              {label}
            </span>
            <button
              onClick={onHint}
              className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors px-3 py-1 rounded-full bg-dark-input hover:bg-dark-card-hover"
              title="Get a hint"
            >
              <Lightbulb size={13} />
              Hint {hintNum > 0 ? `(${hintNum})` : ''}
            </button>
          </div>

          {/* Prompt */}
          {prompt && (
            <p
              className={`text-center text-lg font-semibold mb-6 ${puzzle.subject === 'quran' ? 'arabic' : ''}`}
              dir={puzzle.subject === 'quran' ? 'rtl' : 'ltr'}
            >
              {prompt}
            </p>
          )}

          {/* Puzzle content */}
          <div className="min-h-[140px] flex items-center justify-center">
            {puzzle.type === 'recitation' && <RecitationContent puzzle={puzzle} />}
            {puzzle.type === 'fill_blank' && <FillBlankContent puzzle={puzzle} />}
            {puzzle.type === 'word_order' && <WordOrderContent puzzle={puzzle} />}
            {puzzle.type === 'count'      && <CountContent puzzle={puzzle} />}
            {puzzle.type === 'add'        && <AddContent puzzle={puzzle} />}
            {puzzle.type === 'subtract'   && <SubtractContent puzzle={puzzle} />}
          </div>

          {/* Hint reveal */}
          <AnimatePresence>
            {hint && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-5 overflow-hidden"
              >
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm text-center">
                  💡 {hint}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>

      {/* Result overlay */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.35 }}
            className={`relative mt-4 p-4 rounded-2xl border flex items-center gap-3 ${
              result.is_correct
                ? 'bg-green-500/10 border-green-500/30 text-green-300'
                : 'bg-red-500/10 border-red-500/30 text-red-300'
            }`}
          >
            {result.is_correct ? <CheckCircle size={24} /> : <XCircle size={24} />}
            <div className="flex-1">
              <p className={`font-bold ${puzzle.subject === 'quran' ? 'arabic' : ''}`}>
                {result.encouragement}
              </p>
              {typeof result.accuracy === 'number' && result.accuracy > 0 && result.accuracy < 100 && (
                <p className="text-xs opacity-70 mt-0.5">Accuracy: {result.accuracy}%</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Star burst on correct */}
      <AnimatePresence>
        {result?.is_correct && <StarBurst />}
      </AnimatePresence>
    </motion.div>
  )
}
