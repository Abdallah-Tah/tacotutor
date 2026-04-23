import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { userAPI } from '@/services/api'
import type { Child } from '@/types'

type Props = {
  open: boolean
  onClose: () => void
  onCreated: (child: Child) => void
}

const AVATARS = ['#6C63FF', '#10B981', '#F59E0B', '#EC4899', '#3B82F6']

export default function AddChildModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<string>('')
  const [avatarColor, setAvatarColor] = useState(AVATARS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const reset = () => {
    setName('')
    setAge('')
    setGender('')
    setAvatarColor(AVATARS[0])
    setError('')
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await userAPI.createChild({
        name: name.trim(),
        age: age ? Number(age) : undefined,
        gender: gender || undefined,
        avatar_color: avatarColor,
      })
      onCreated(res.data)
      handleClose()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to add child')
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.form
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            className="glass-card rounded-2xl p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Add Child</h2>
                <p className="text-sm text-muted">Create a child profile to assign lessons.</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 rounded-lg hover:bg-dark-card-hover transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Child name"
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Age</label>
                <input
                  type="number"
                  min={1}
                  max={18}
                  inputMode="numeric"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="Optional"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Gender</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`flex-1 py-3 rounded-xl border-2 text-center font-semibold transition-all ${gender === 'male' ? 'border-blue-400 bg-blue-500/20 text-blue-300' : 'border-dark-input bg-dark-input text-muted hover:border-blue-400/50'}`}
                  >
                    👦 Boy
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`flex-1 py-3 rounded-xl border-2 text-center font-semibold transition-all ${gender === 'female' ? 'border-pink-400 bg-pink-500/20 text-pink-300' : 'border-dark-input bg-dark-input text-muted hover:border-pink-400/50'}`}
                  >
                    👧 Girl
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Avatar Color</label>
                <div className="flex gap-3">
                  {AVATARS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setAvatarColor(color)}
                      className={`w-10 h-10 rounded-xl border-2 transition-all ${avatarColor === color ? 'border-white scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={handleClose} className="flex-1 btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="flex-1 btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Plus size={18} />
                    Add Child
                  </>
                )}
              </button>
            </div>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
