import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Star, Flame, Trophy, Play, ArrowRight, Sparkles } from 'lucide-react'
import { sessionAPI } from '@/services/api'
import type { KidDashboardData } from '@/types'

export default function KidDashboard() {
  const { childId } = useParams()
  const [data, setData] = useState<KidDashboardData | null>(null)
  const [loading, setLoading] = useState(true)

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted">Failed to load dashboard.</p>
      </div>
    )
  }

  const { child, current_lesson, streak_days, rewards, progress } = data
  const quranProgress = progress.find(p => p.subject === 'quran')

  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-4xl"
            style={{ backgroundColor: child.avatar_color }}
          >
            👶
          </div>
          <h1 className="text-3xl font-black mb-2">
            Assalamu Alaikum, {child.name}!
          </h1>
          <p className="text-muted">Ready to learn something amazing today?</p>
        </motion.div>

        {/* Streak & Rewards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <RewardCard
            icon={<Flame size={24} />}
            value={`${streak_days}`}
            label="Day Streak"
            color="from-orange-500 to-red-500"
          />
          <RewardCard
            icon={<Star size={24} />}
            value={`${rewards.length}`}
            label="Stars"
            color="from-warning to-yellow-500"
          />
          <RewardCard
            icon={<Trophy size={24} />}
            value={`${Math.round(quranProgress?.mastery_score || 0)}%`}
            label="Quran"
            color="from-primary to-accent"
          />
        </div>

        {/* Current Lesson */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          {current_lesson ? (
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <div className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm font-semibold">
                  {current_lesson.status === 'in_progress' ? 'In Progress' : 'New'}
                </div>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl">
                  🕌
                </div>
                <div>
                  <p className="text-sm text-muted uppercase tracking-wider font-semibold">Current Lesson</p>
                  <h2 className="text-2xl font-black">{current_lesson.lesson?.title}</h2>
                </div>
              </div>

              <p className="text-muted mb-6">{current_lesson.lesson?.description}</p>

              <div className="flex gap-3">
                <Link
                  to={`/live/${childId}/${current_lesson.lesson_id}`}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 text-lg py-4"
                >
                  <Play size={20} />
                  Continue Learning
                </Link>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-8 text-center">
              <Sparkles size={48} className="mx-auto mb-4 text-muted" />
              <h2 className="text-2xl font-bold mb-2">No Lesson Assigned</h2>
              <p className="text-muted mb-6">Ask your parent to assign a lesson for you!</p>
            </div>
          )}
        </motion.div>

        {/* Progress */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Your Progress</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {progress.map((p) => (
              <motion.div
                key={p.id}
                whileHover={{ scale: 1.02 }}
                className="glass-card rounded-2xl p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold capitalize">{p.subject}</span>
                  <span className="text-sm text-muted">Level {p.level}</span>
                </div>
                <div className="w-full h-3 bg-dark-input rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                    style={{ width: `${p.mastery_score}%` }}
                  />
                </div>
                <p className="text-sm text-muted">{Math.round(p.mastery_score)}% mastery</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            to={`/live/${childId}`}
            className="glass-card rounded-2xl p-6 flex items-center gap-4 hover:border-primary/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white">
              <Play size={24} />
            </div>
            <div>
              <h3 className="font-bold">Live Tutor</h3>
              <p className="text-sm text-muted">Practice with the AI tutor</p>
            </div>
            <ArrowRight size={20} className="ml-auto text-muted" />
          </Link>

          <Link
            to={`/play/${childId}`}
            className="glass-card rounded-2xl p-6 flex items-center gap-4 hover:border-primary/50 transition-colors"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-emerald-500 flex items-center justify-center text-white">
              <BookOpen size={24} />
            </div>
            <div>
              <h3 className="font-bold">Practice</h3>
              <p className="text-sm text-muted">Review and practice</p>
            </div>
            <ArrowRight size={20} className="ml-auto text-muted" />
          </Link>
        </div>
      </div>
    </div>
  )
}

function RewardCard({ icon, value, label, color }: { icon: React.ReactNode; value: string; label: string; color: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="glass-card rounded-2xl p-4 text-center"
    >
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white mx-auto mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </motion.div>
  )
}
