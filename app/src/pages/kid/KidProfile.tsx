import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Save, ArrowLeft } from 'lucide-react'
import api from '@/services/api'
import type { Child } from '@/types'

export default function KidProfile() {
  const { childId } = useParams()
  const navigate = useNavigate()
  const [child, setChild] = useState<Child | null>(null)
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<string>('')
  const [avatarColor, setAvatarColor] = useState('#6C63FF')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const AVATARS = ['#6C63FF', '#10B981', '#F59E0B', '#EC4899', '#3B82F6', '#8B5CF6']

  useEffect(() => {
    if (childId) loadChild()
  }, [childId])

  const loadChild = async () => {
    try {
      const res = await api.get(`/users/children/${childId}`)
      const c = res.data
      setChild(c)
      setName(c.name)
      setAge(c.age?.toString() || '')
      setGender(c.gender || '')
      setAvatarColor(c.avatar_color)
    } catch {
      // Try public kid endpoint
      try {
        const dashRes = await api.get(`/sessions/dashboard/kid/${childId}`)
        const c = dashRes.data.child
        setChild(c)
        setName(c.name)
        setAge(c.age?.toString() || '')
        setGender(c.gender || '')
        setAvatarColor(c.avatar_color)
      } catch (err) {
        console.error('Failed to load child:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!childId) return
    setSaving(true)
    try {
      await api.patch(`/users/children/${childId}`, {
        name: name.trim(),
        age: age ? Number(age) : null,
        gender: gender || null,
        avatar_color: avatarColor,
      })
      alert('Profile saved!')
    } catch (err) {
      console.error('Failed to save:', err)
      alert('Failed to save — you may need to be logged in as parent.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  const genderEmoji = gender === 'male' ? '👦' : gender === 'female' ? '👧' : '👶'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <button
        onClick={() => navigate(`/kid/${childId}`)}
        className="flex items-center gap-2 text-muted hover:text-text mb-6 transition-colors"
      >
        <ArrowLeft size={18} /> Back to Dashboard
      </button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black mb-8">My Profile</h1>

        <div className="glass-card rounded-3xl p-8">
          {/* Avatar */}
          <div className="flex items-center gap-6 mb-8">
            <div
              className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
              style={{ backgroundColor: avatarColor }}
            >
              {genderEmoji}
            </div>
            <div>
              <h2 className="text-2xl font-bold">{child?.name || 'Kid'}</h2>
              <p className="text-muted">
                {age ? `${age} years old` : 'Age not set'} · {gender === 'male' ? 'Boy' : gender === 'female' ? 'Girl' : 'Gender not set'}
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Age</label>
              <input
                type="number"
                min={1}
                max={18}
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="input-field"
                placeholder="How old are you?"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">I am a...</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setGender('male')}
                  className={`flex-1 py-4 rounded-2xl border-2 text-center font-bold text-lg transition-all ${
                    gender === 'male'
                      ? 'border-blue-400 bg-blue-500/20 text-blue-300 scale-105'
                      : 'border-dark-input bg-dark-input text-muted hover:border-blue-400/50'
                  }`}
                >
                  👦 Boy
                </button>
                <button
                  type="button"
                  onClick={() => setGender('female')}
                  className={`flex-1 py-4 rounded-2xl border-2 text-center font-bold text-lg transition-all ${
                    gender === 'female'
                      ? 'border-pink-400 bg-pink-500/20 text-pink-300 scale-105'
                      : 'border-dark-input bg-dark-input text-muted hover:border-pink-400/50'
                  }`}
                >
                  👧 Girl
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Favorite Color</label>
              <div className="flex gap-3">
                {AVATARS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setAvatarColor(color)}
                    className={`w-12 h-12 rounded-xl border-2 transition-all ${
                      avatarColor === color ? 'border-white scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50 py-4 text-lg"
            >
              <Save size={20} />
              {saving ? 'Saving...' : 'Save My Profile'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
