import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Users, BookOpen, TrendingUp, Clock, Plus, ChevronRight, Star } from 'lucide-react'
import { sessionAPI, userAPI } from '@/services/api'
import AddChildModal from '@/components/AddChildModal'
import type { Child, Session, ProgressRecord } from '@/types'

export default function ParentDashboard() {
  const navigate = useNavigate()
  const [children, setChildren] = useState<Child[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [progress, setProgress] = useState<ProgressRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddChildModal, setShowAddChildModal] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [childrenRes, dashboardRes] = await Promise.all([
        userAPI.listChildren(),
        sessionAPI.parentDashboard(),
      ])
      setChildren(childrenRes.data)
      setSessions(dashboardRes.data.recent_sessions || [])
      setProgress(dashboardRes.data.progress_summaries || [])
    } catch (err) {
      console.error('Failed to load dashboard:', err)
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

  const totalSessions = sessions.length
  const totalPracticeTime = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0)
  const avgMastery = progress.length > 0
    ? progress.reduce((acc, p) => acc + p.mastery_score, 0) / progress.length
    : 0

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-black">Parent Dashboard</h1>
        <p className="text-muted">Overview of your children's learning progress</p>
        <button
          onClick={() => navigate('/parent/profile')}
          className="mt-3 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-sm font-semibold"
        >
          ⚙️ My Profile
        </button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Users size={20} />}
          label="Children"
          value={children.length.toString()}
          color="from-primary to-primary-dark"
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="Total Sessions"
          value={totalSessions.toString()}
          color="from-accent to-emerald-500"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="Practice Time"
          value={`${Math.round(totalPracticeTime / 60)}m`}
          color="from-secondary to-pink-500"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Avg Mastery"
          value={`${Math.round(avgMastery)}%`}
          color="from-warning to-orange-500"
        />
      </div>

      {/* Children Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Your Children</h2>
          <button
            onClick={() => setShowAddChildModal(true)}
            className="btn-secondary text-sm inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Add Child
          </button>
        </div>

        {children.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card rounded-2xl p-8 text-center"
          >
            <Users size={48} className="mx-auto mb-4 text-muted" />
            <h3 className="font-bold text-lg mb-2">No children added yet</h3>
            <p className="text-muted mb-4">Add your first child to start their learning journey.</p>
            <button
              onClick={() => setShowAddChildModal(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus size={18} />
              Add First Child
            </button>
          </motion.div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {children.map((child, i) => {
              const childProgress = progress.filter(p => p.child_id === child.id)
              const childSessions = sessions.filter(s => s.child_id === child.id)
              const mastery = childProgress.length > 0
                ? childProgress.reduce((a, p) => a + p.mastery_score, 0) / childProgress.length
                : 0

              return (
                <motion.div
                  key={child.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <Link
                    to={`/parent/child/${child.id}`}
                    className="glass-card rounded-2xl p-6 block hover:border-primary/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: child.avatar_color }}
                        >
                          👶
                        </div>
                        <div>
                          <h3 className="font-bold text-lg">{child.name}</h3>
                          <p className="text-sm text-muted">
                            {child.age ? `${child.age} years old` : 'Age not set'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-muted group-hover:text-primary transition-colors" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Sessions</span>
                        <span className="font-semibold">{childSessions.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Mastery</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-dark-input rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                              style={{ width: `${mastery}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">{Math.round(mastery)}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted">Streak</span>
                        <div className="flex items-center gap-1">
                          <Star size={14} className="text-warning" />
                          <span className="font-semibold">
                            {childProgress.reduce((a, p) => Math.max(a, p.streak_days), 0)} days
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex gap-2">
                      <Link
                        to={`/kid/${child.id}`}
                        className="flex-1 btn-secondary text-center text-sm py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Kid View
                      </Link>
                      <Link
                        to={`/live/${child.id}`}
                        className="flex-1 btn-primary text-center text-sm py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Start Session
                      </Link>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      <AddChildModal
        open={showAddChildModal}
        onClose={() => setShowAddChildModal(false)}
        onCreated={() => loadData()}
      />

      {/* Recent Sessions */}
      {sessions.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-4">Recent Sessions</h2>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="divide-y divide-border">
              {sessions.slice(0, 10).map((session, i) => {
                const child = children.find(c => c.id === session.child_id)
                const duration = Math.round((session.duration_seconds || 0) / 60)

                return (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="p-4 flex items-center justify-between hover:bg-dark-card-hover transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-sm"
                        style={{ backgroundColor: child?.avatar_color || '#6C63FF' }}
                      >
                        {child?.name?.[0] || '?'}
                      </div>
                      <div>
                        <p className="font-semibold">{child?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted">
                          {new Date(session.started_at).toLocaleDateString()} · {duration}m
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted">Correct: {session.correct_count}</p>
                        <p className="text-sm text-muted">Mistakes: {session.mistake_count}</p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-2xl p-5"
    >
      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center text-white mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </motion.div>
  )
}
