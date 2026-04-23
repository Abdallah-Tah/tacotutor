import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, FileText, Trash2, Edit2, Check, X, Save } from 'lucide-react'
import { instructionAPI } from '@/services/api'
import type { InstructionFile } from '@/types'

const DEFAULT_TEMPLATE = `# Instruction: Beginner Quran Reading

## Metadata
level: beginner
mode: reading
pace: slow
subject: quran

## Target
- Surah: Al-Fatiha
- Ayah: 1-7

## Goals
- Learn proper pronunciation of each word
- Understand basic meaning
- Build confidence in reading Arabic

## Teaching Rules
- Say each word slowly and clearly
- Break long words into syllables
- Repeat each word 3 times before moving on
- Use simple, encouraging language
- Celebrate every small success

## Correction Rules
- Never criticize or show frustration
- Gently model the correct pronunciation
- Ask the child to repeat after you
- If struggling, simplify to individual letters first
- Praise effort, not just correctness

## Visual Guidance Rules
- Highlight current word in blue
- Show next word in green
- Mark mistakes in red
- Use bouncing animation for current word
- Smooth transitions between words

## Tutor Behavior
- Always start with "Assalamu alaikum"
- Keep responses to 1-2 sentences
- End each turn with one clear next step
- If child is silent for 5 seconds, prompt gently
- If child struggles for 3 attempts, simplify the task

## Parent Notes
- Child learns best with visual + auditory reinforcement
- Prefers slower pace with more repetition
- Responds well to star rewards
- Best practice time: after school, 15-20 minutes
`

export default function InstructionsPage() {
  const [instructions, setInstructions] = useState<InstructionFile[]>([])
  const [loading, setLoading] = useState(true)
  const [showEditor, setShowEditor] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [content, setContent] = useState(DEFAULT_TEMPLATE)

  useEffect(() => {
    loadInstructions()
  }, [])

  const loadInstructions = async () => {
    try {
      const res = await instructionAPI.list()
      setInstructions(res.data)
    } catch (err) {
      console.error('Failed to load instructions:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    try {
      if (editingId) {
        await instructionAPI.update(editingId, { name, content })
      } else {
        await instructionAPI.create({ name, content })
      }
      await loadInstructions()
      resetEditor()
    } catch (err) {
      console.error('Failed to save:', err)
    }
  }

  const handleEdit = (instruction: InstructionFile) => {
    setEditingId(instruction.id)
    setName(instruction.name)
    setContent(instruction.content)
    setShowEditor(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this instruction file?')) return
    try {
      await instructionAPI.delete(id)
      await loadInstructions()
    } catch (err) {
      console.error('Failed to delete:', err)
    }
  }

  const resetEditor = () => {
    setShowEditor(false)
    setEditingId(null)
    setName('')
    setContent(DEFAULT_TEMPLATE)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black">Instruction Files</h1>
            <p className="text-muted">Custom teaching instructions for the AI tutor</p>
          </div>
          <button
            onClick={() => setShowEditor(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            New Instruction
          </button>
        </div>
      </motion.div>

      {/* Instructions List */}
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {instructions.map((instruction, i) => (
          <motion.div
            key={instruction.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white">
                  <FileText size={20} />
                </div>
                <div>
                  <h3 className="font-bold">{instruction.name}</h3>
                  <p className="text-xs text-muted">
                    {new Date(instruction.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleEdit(instruction)}
                  className="p-2 rounded-lg hover:bg-dark-card-hover transition-colors text-muted hover:text-text"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(instruction.id)}
                  className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-muted hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-dark-input max-h-32 overflow-y-auto">
              <pre className="text-xs text-muted whitespace-pre-wrap">{instruction.content.substring(0, 200)}...</pre>
            </div>
          </motion.div>
        ))}
      </div>

      {instructions.length === 0 && !showEditor && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card rounded-2xl p-8 text-center"
        >
          <FileText size={48} className="mx-auto mb-4 text-muted" />
          <h3 className="font-bold text-lg mb-2">No instruction files yet</h3>
          <p className="text-muted mb-4">Create custom instructions to guide the AI tutor's behavior.</p>
          <button onClick={() => setShowEditor(true)} className="btn-primary">
            Create First Instruction
          </button>
        </motion.div>
      )}

      {/* Editor */}
      <AnimatePresence>
        {showEditor && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="glass-card rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">
                {editingId ? 'Edit Instruction' : 'New Instruction'}
              </h2>
              <button onClick={resetEditor} className="p-2 rounded-lg hover:bg-dark-card-hover">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Beginner Reading Mode"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">Content (Markdown)</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={20}
                  className="input-field font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button onClick={resetEditor} className="btn-secondary">
                  Cancel
                </button>
                <button onClick={handleSave} className="btn-primary flex items-center gap-2">
                  <Save size={18} />
                  Save Instruction
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
