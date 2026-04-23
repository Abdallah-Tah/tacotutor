import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, Star, Flame, Trophy, Sparkles, ChevronRight, Mic, Headphones } from 'lucide-react'
import { sessionAPI } from '@/services/api'
import api from '@/services/api'
import type { KidDashboardData, LessonAssignment } from '@/types'

const SUBJECTS = [
  { id: 'quran', name: 'القرآن الكريم', nameEn: 'Quran', icon: '🕌', color: 'from-emerald-500 to-teal-600', emoji: '📖' },
  { id: 'math', name: 'الرياضيات', nameEn: 'Math', icon: '🔢', color: 'from-blue-500 to-indigo-600', emoji: '🧮' },
  { id: 'english', name: 'اللغة الإنجليزية', nameEn: 'English', icon: '🔤', color: 'from-purple-500 to-pink-600', emoji: '📝' },
] as const

export default function KidDashboard() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<KidDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<'dashboard' | 'subject' | 'lesson'>('dashboard')
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [assignments, setAssignments] = useState<LessonAssignment[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)

  useEffect(() => {
    if (childId) loadData()
  }, [childId])

  const loadData = async () => {
    try {
      const res = await sessionAPI.kidDashboard(childId!)
      setData(res.data)
    } catch (err) {
      console.error('Failed to load kid dashboard:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectSubject = async (subject: string) => {
    setSelectedSubject(subject)
    setLessonsLoading(true)
    setStep('lesson')
    try {
      const res = await api.get(`/lessons/kid/${childId}/assignments`, { params: { subject } })
      setAssignments(res.data as LessonAssignment[])
    } catch {
      setAssignments([])
    } finally {
      setLessonsLoading(false)
    }
  }

  const startSession = (lessonId: string) => {
    navigate(`/live/${childId}/${lessonId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <p className="text-muted">Failed to load dashboard.</p>
      </div>
    )
  }

  const { child, streak_days, rewards, progress } = data
  const quranProgress = progress.find(p => p.subject === 'quran')

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl"
            style={{ backgroundColor: child.avatar_color }}
          >
            👶
          </div>
          <h1 className="text-3xl font-black mb-2">
            assalamu alaikum, {child.name}!
          </h1>
          <p className="text-muted">Ready to learn something amazing today?</p>
          <button
            onClick={() => navigate(`/kid/${childId}/profile`)}
            className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold"
          >
            ⚙️ My Profile
          </button>
        </motion.div>

        {/* Streak & Rewards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <RewardCard icon={<Flame size={24} />} value={`${streak_days}`} label="Day Streak" color="from-orange-500 to-red-500" />
          <RewardCard icon={<Star size={24} />} value={`${rewards.length}`} label="Stars" color="from-warning to-yellow-500" />
          <RewardCard icon={<Trophy size={24} />} value={`${Math.round(quranProgress?.mastery_score || 0)}%`} label="Quran" color="from-primary to-accent" />
        </div>

        {/* Start Session CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <button
            onClick={() => setStep('subject')}
            className="w-full glass-card rounded-3xl p-8 text-center hover:border-primary/50 transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl mx-auto mb-4 group-hover:scale-110 transition-transform">
              🚀
            </div>
            <h2 className="text-2xl font-black mb-2">Start a Lesson</h2>
            <p className="text-muted">Pick a subject and start learning with your AI tutor!</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-primary">
              <span className="font-semibold">Let's Go</span>
              <ChevronRight size={20} />
            </div>
          </button>
        </motion.div>

        {/* Subject + Lesson Modal Overlay */}
        <AnimatePresence>
          {step !== 'dashboard' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setStep('dashboard')}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="glass-card rounded-3xl p-8 w-full max-w-lg max-h-[80vh] overflow-y-auto"
              >
                {step === 'subject' && (
                  <>
                    <h3 className="text-2xl font-black text-center mb-2">Choose a Subject</h3>
                    <p className="text-muted text-center mb-6">What do you want to learn today?</p>
                    <div className="space-y-4">
                      {SUBJECTS.map(subject => (
                        <button
                          key={subject.id}
                          onClick={() => selectSubject(subject.id)}
                          className="w-full glass-card rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 transition-all cursor-pointer group"
                        >
                          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-3xl`}>
                            {subject.icon}
                          </div>
                          <div className="text-left flex-1">
                            <h4 className="text-xl font-bold">{subject.name}</h4>
                            <p className="text-sm text-muted">{subject.nameEn}</p>
                          </div>
                          <ChevronRight size={24} className="text-muted group-hover:text-primary transition-colors" />
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {step === 'lesson' && (
                  <>
                    <div className="flex items-center gap-3 mb-6">
                      <button onClick={() => setStep('subject')} className="text-muted hover:text-white transition-colors">
                        ← Back
                      </button>
                      <h3 className="text-2xl font-black">
                        {SUBJECTS.find(s => s.id === selectedSubject)?.emoji}{' '}
                        {SUBJECTS.find(s => s.id === selectedSubject)?.name}
                      </h3>
                    </div>

                    {lessonsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      </div>
                    ) : assignments.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted mb-4">Pick a lesson to start:</p>
                        {assignments.map(a => (
                          <button
                            key={a.id}
                            onClick={() => startSession(a.lesson_id)}
                            className="w-full glass-card rounded-2xl p-5 flex items-center gap-4 hover:border-primary/50 transition-all cursor-pointer group text-left"
                          >
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${SUBJECTS.find(s => s.id === selectedSubject)?.color || 'from-primary to-secondary'} flex items-center justify-center text-xl`}>
                              {a.lesson?.lesson_type === 'surah' ? '📖' : a.lesson?.lesson_type === 'letter' ? '✍️' : '📚'}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-bold text-lg">{a.lesson?.title}</h4>
                              {a.lesson?.description && (
                                <p className="text-sm text-muted line-clamp-2">{a.lesson.description}</p>
                              )}
                              {a.status === 'in_progress' && (
                                <span className="text-xs text-primary font-semibold mt-1 inline-block">In Progress</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Headphones size={18} className="text-primary" />
                              <ChevronRight size={20} className="text-muted group-hover:text-primary" />
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Sparkles size={48} className="mx-auto mb-4 text-muted" />
                        <h4 className="text-xl font-bold mb-2">No Lessons Yet</h4>
                        <p className="text-muted">Ask your parent to assign a {SUBJECTS.find(s => s.id === selectedSubject)?.nameEn} lesson!</p>
                      </div>
                    )}
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress */}
        {progress.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Your Progress</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {progress.map(p => (
                <motion.div key={p.id} whileHover={{ scale: 1.02 }} className="glass-card rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold capitalize">{p.subject}</span>
                    <span className="text-sm text-muted">Level {p.level}</span>
                  </div>
                  <div className="w-full h-3 bg-dark-input rounded-full overflow-hidden mb-2">
                    <div className="h-full bg-gradient-to-r from-primary to-accent rounded-full" style={{ width: `${p.mastery_score}%` }} />
                  </div>
                  <p className="text-sm text-muted">{Math.round(p.mastery_score)}% mastery</p>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function RewardCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <motion.div whileHover={{ scale: 1.05 }} className="glass-card rounded-2xl p-4 text-center">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mx-auto mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </motion.div>
  )
}
