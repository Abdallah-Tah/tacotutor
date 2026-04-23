import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookOpen, Plus, Search, X,
  Check, GraduationCap
} from 'lucide-react'
import { lessonAPI, userAPI } from '@/services/api'
import AddChildModal from '@/components/AddChildModal'
import type { Lesson, Child, LessonAssignment } from '@/types'

const SUBJECTS = [
  { id: 'quran', name: 'Quran', icon: '🕌', color: 'from-primary to-primary-dark' },
  { id: 'english', name: 'English', icon: '📖', color: 'from-accent to-emerald-500' },
  { id: 'math', name: 'Math', icon: '🔢', color: 'from-secondary to-pink-500' },
]

export default function LessonManagement() {
  const [children, setChildren] = useState<Child[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [assignments, setAssignments] = useState<LessonAssignment[]>([])
  const [selectedSubject, setSelectedSubject] = useState('quran')
  const [selectedChild, setSelectedChild] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showAddChildModal, setShowAddChildModal] = useState(false)
  const [lessonToAssign, setLessonToAssign] = useState<Lesson | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [childrenRes, lessonsRes] = await Promise.all([
        userAPI.listChildren(),
        lessonAPI.list(),
      ])
      setChildren(childrenRes.data)
      setLessons(lessonsRes.data)

      if (childrenRes.data.length > 0) {
        setSelectedChild((current) => current || childrenRes.data[0].id)
      }
    } catch (err) {
      console.error('Failed to load lessons:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    if (!selectedChild) return
    try {
      const res = await lessonAPI.getAssignments(selectedChild)
      setAssignments(res.data)
    } catch (err) {
      console.error('Failed to load assignments:', err)
    }
  }

  useEffect(() => {
    if (selectedChild) {
      loadAssignments()
    }
  }, [selectedChild])

  const filteredLessons = lessons.filter(l => {
    const matchesSubject = l.subject === selectedSubject
    const matchesSearch = !search || l.title.toLowerCase().includes(search.toLowerCase())
    return matchesSubject && matchesSearch
  })

  const isAssigned = (lessonId: string) =>
    assignments.some(a => a.lesson_id === lessonId)

  const handleAssign = async (lesson: Lesson) => {
    if (!selectedChild) {
      alert('Please select a child first')
      return
    }
    setLessonToAssign(lesson)
    setShowAssignModal(true)
  }

  const confirmAssign = async () => {
    if (!lessonToAssign || !selectedChild) return
    try {
      await lessonAPI.assign(selectedChild, lessonToAssign.id)
      await loadAssignments()
      setShowAssignModal(false)
      setLessonToAssign(null)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to assign lesson')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-black">Lesson Management</h1>
        <p className="text-muted">Browse lessons and assign them to your children</p>
      </motion.div>

      {/* Child Selector */}
      <div className="glass-card rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <GraduationCap size={20} className="text-primary" />
              <span className="font-semibold">Assigning for:</span>
            </div>
            {children.length > 0 ? (
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="input-field w-auto py-2 px-4"
              >
                {children.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-muted text-sm">No child profile yet</span>
            )}
          </div>
          <button
            onClick={() => setShowAddChildModal(true)}
            className="btn-secondary text-sm inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Add Child
          </button>
        </div>
      </div>

      {/* Subject Tabs */}
      <div className="flex gap-2 mb-6">
        {SUBJECTS.map(subject => (
          <button
            key={subject.id}
            onClick={() => setSelectedSubject(subject.id)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all ${
              selectedSubject === subject.id
                ? 'bg-gradient-to-r ' + subject.color + ' text-white shadow-lg'
                : 'glass-card text-muted hover:text-text'
            }`}
          >
            <span>{subject.icon}</span>
            <span className="hidden sm:inline">{subject.name}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lessons..."
          className="input-field pl-11"
        />
      </div>

      {children.length === 0 && (
        <div className="glass-card rounded-2xl p-8 text-center mb-6">
          <GraduationCap size={48} className="mx-auto mb-4 text-muted" />
          <h3 className="font-bold text-lg mb-2">Add a child before assigning lessons</h3>
          <p className="text-muted mb-4">Create a child profile first, then you can assign Quran, English, and Math lessons.</p>
          <button
            onClick={() => setShowAddChildModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus size={18} />
            Add Child
          </button>
        </div>
      )}

      {/* Lessons Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLessons.map((lesson, i) => (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-2xl p-6 hover:border-primary/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                  {lesson.subject === 'quran' ? '🕌' : lesson.subject === 'english' ? '📖' : '🔢'}
                </span>
                <div className="px-2 py-1 rounded-lg bg-dark-input text-xs font-semibold text-muted">
                  Level {lesson.level}
                </div>
              </div>
              {isAssigned(lesson.id) && (
                <div className="px-2 py-1 rounded-lg bg-success/20 text-success text-xs font-semibold flex items-center gap-1">
                  <Check size={12} />
                  Assigned
                </div>
              )}
            </div>

            <h3 className="font-bold text-lg mb-2">{lesson.title}</h3>
            <p className="text-sm text-muted mb-4 line-clamp-2">{lesson.description || 'No description'}</p>

            <div className="flex items-center justify-between">
              <div className="text-xs text-muted">
                Type: <span className="text-text">{lesson.lesson_type || 'General'}</span>
              </div>
              <button
                onClick={() => handleAssign(lesson)}
                disabled={isAssigned(lesson.id)}
                className={`text-sm px-4 py-2 rounded-xl font-semibold transition-all ${
                  isAssigned(lesson.id)
                    ? 'bg-dark-input text-muted cursor-not-allowed'
                    : 'btn-primary'
                }`}
              >
                {isAssigned(lesson.id) ? 'Assigned' : 'Assign'}
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredLessons.length === 0 && (
        <div className="text-center py-12">
          <BookOpen size={48} className="mx-auto mb-4 text-muted" />
          <p className="text-muted">No lessons found for this subject.</p>
        </div>
      )}

      <AddChildModal
        open={showAddChildModal}
        onClose={() => setShowAddChildModal(false)}
        onCreated={(child) => {
          setChildren((prev) => [...prev, child])
          setSelectedChild(child.id)
        }}
      />

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && lessonToAssign && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAssignModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 max-w-md w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Assign Lesson</h2>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="p-2 rounded-lg hover:bg-dark-card-hover transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-muted mb-2">You are about to assign:</p>
                <div className="glass-card rounded-xl p-4">
                  <h3 className="font-bold">{lessonToAssign.title}</h3>
                  <p className="text-sm text-muted">{lessonToAssign.description}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2">To child:</label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="input-field"
                >
                  {children.map(child => (
                    <option key={child.id} value={child.id}>{child.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAssign}
                  className="flex-1 btn-primary"
                >
                  Confirm Assign
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
