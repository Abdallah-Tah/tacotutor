import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Save, Trash2, User, BookOpen, Settings } from 'lucide-react'
import { userAPI } from '@/services/api'
import type { Child, StudentProfile, ProgressRecord } from '@/types'

export default function ChildProfile() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [progress, setProgress] = useState<ProgressRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [pace, setPace] = useState('medium')
  const [correctionStyle, setCorrectionStyle] = useState('gentle')

  useEffect(() => {
    if (childId) loadData()
  }, [childId])

  const loadData = async () => {
    try {
      const [childRes, profileRes, progressRes] = await Promise.all([
        userAPI.getChild(childId!),
        userAPI.getProfile(childId!),
        userAPI.getProgress(childId!),
      ])
      setChild(childRes.data)
      setProfile(profileRes.data)
      setProgress(progressRes.data)

      setName(childRes.data.name)
      setAge(childRes.data.age?.toString() || '')
      setPace(profileRes.data.learning_pace)
      setCorrectionStyle(profileRes.data.correction_style)
    } catch (err) {
      console.error('Failed to load child profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!childId) return
    setSaving(true)
    try {
      await userAPI.updateProfile(childId, {
        learning_pace: pace,
        correction_style: correctionStyle,
      })
      alert('Profile updated!')
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this child?')) return
    try {
      await userAPI.deleteChild(childId!)
      navigate('/parent')
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (!child) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-muted">Child not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button
        onClick={() => navigate('/parent')}
        className="flex items-center gap-2 text-muted hover:text-text mb-6 transition-colors"
      >
        <ArrowLeft size={18} />
        Back to Dashboard
      </button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: child.avatar_color }}
          >
            👶
          </div>
          <div>
            <h1 className="text-3xl font-black">{child.name}</h1>
            <p className="text-muted">{child.age ? `${child.age} years old` : 'Age not set'} · Level {profile?.current_level}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Settings size={20} className="text-primary" />
                <h2 className="text-xl font-bold">Learning Settings</h2>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Learning Pace</label>
                  <select
                    value={pace}
                    onChange={(e) => setPace(e.target.value)}
                    className="input-field"
                  >
                    <option value="slow">Slow - More repetition, gentle pace</option>
                    <option value="medium">Medium - Balanced pace</option>
                    <option value="fast">Fast - Quick progression</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Correction Style</label>
                  <select
                    value={correctionStyle}
                    onChange={(e) => setCorrectionStyle(e.target.value)}
                    className="input-field"
                  >
                    <option value="gentle">Gentle - Soft corrections with lots of praise</option>
                    <option value="direct">Direct - Clear corrections, focused feedback</option>
                  </select>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Progress */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <BookOpen size={20} className="text-accent" />
                <h2 className="text-xl font-bold">Progress by Subject</h2>
              </div>

              {progress.length === 0 ? (
                <p className="text-muted">No progress data yet. Start a session to see progress.</p>
              ) : (
                <div className="space-y-4">
                  {progress.map((p) => (
                    <div key={p.id} className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold capitalize">{p.subject}</span>
                          <span className="text-sm text-muted">Level {p.level}</span>
                        </div>
                        <div className="w-full h-3 bg-dark-input rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                            style={{ width: `${p.mastery_score}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted">{Math.round(p.mastery_score)}% mastery</span>
                          <span className="text-xs text-muted">{p.streak_days} day streak</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-bold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  to={`/kid/${childId}`}
                  className="block w-full btn-primary text-center"
                >
                  Open Kid Dashboard
                </Link>
                <Link
                  to={`/live/${childId}`}
                  className="block w-full btn-secondary text-center"
                >
                  Start Live Session
                </Link>
                <Link
                  to="/lessons"
                  className="block w-full btn-secondary text-center"
                >
                  Assign Lessons
                </Link>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border-red-500/20">
              <h3 className="font-bold text-red-400 mb-4">Danger Zone</h3>
              <button
                onClick={handleDelete}
                className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Remove Child
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
