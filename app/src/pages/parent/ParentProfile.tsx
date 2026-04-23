import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { User, Mail, Save, LogOut, Shield } from 'lucide-react'
import { authAPI, userAPI } from '@/services/api'
import type { User as UserType } from '@/types'

export default function ParentProfile() {
  const navigate = useNavigate()
  const [user, setUser] = useState<UserType | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const res = await authAPI.me()
      setUser(res.data)
      setDisplayName(res.data.display_name || '')
    } catch {
      // Not logged in
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await userAPI.updateParent(displayName)
      alert('Profile updated!')
    } catch (err) {
      console.error('Failed to save:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-black mb-8">Parent Profile</h1>

        {/* Avatar */}
        <div className="glass-card rounded-3xl p-8 mb-6">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl">
              👨‍👩‍👧
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.display_name || 'Parent'}</h2>
              <p className="text-muted flex items-center gap-1">
                <Mail size={14} /> {user?.email}
              </p>
              <p className="text-xs text-muted mt-1 flex items-center gap-1">
                <Shield size={12} /> Role: {user?.role}
              </p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2">Display Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                value={user?.email || ''}
                disabled
                className="input-field opacity-50 cursor-not-allowed"
              />
              <p className="text-xs text-muted mt-1">Email cannot be changed</p>
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

        {/* Account actions */}
        <div className="glass-card rounded-3xl p-6">
          <h3 className="font-bold mb-4">Account</h3>
          <button
            onClick={handleLogout}
            className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  )
}
