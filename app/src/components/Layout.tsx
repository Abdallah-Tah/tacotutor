import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, BookOpen, Settings, Users, LogOut, Menu, X,
  User, Baby, GraduationCap, MessageSquare, ChevronDown, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/services/api'
import type { Child } from '@/types'

const NAV_ITEMS = [
  { path: '/parent', icon: Home, label: 'Dashboard', group: 'parent' },
  { path: '/parent/profile', icon: User, label: 'My Profile', group: 'parent' },
  { path: '/lessons', icon: BookOpen, label: 'Lessons', group: 'parent' },
  { path: '/instructions', icon: MessageSquare, label: 'Instructions', group: 'parent' },
]

export default function Layout() {
  const { isAuthenticated, user, logout } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [childrenOpen, setChildrenOpen] = useState(false)
  const [children, setChildren] = useState<Child[]>([])

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/users/children').then(res => setChildren(res.data)).catch(() => {})
    }
  }, [isAuthenticated])

  // Detect if we're on a kid page
  const isKidPage = location.pathname.startsWith('/kid/')

  // For kid pages, render without sidebar
  if (isKidPage) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <Outlet />
      </div>
    )
  }

  // For non-authenticated users on non-kid pages
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-3xl mx-auto mb-4">🌮</div>
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link to="/login" className="btn-primary inline-block px-8 py-3">Go to Login</Link>
        </div>
      </div>
    )
  }

  const isActive = (path: string) => {
    if (path === '/parent') return location.pathname === '/parent'
    return location.pathname.startsWith(path)
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-2xl">
            🌮
          </div>
          <div>
            <span className="font-bold text-xl gradient-text">TacoTutor</span>
            <p className="text-xs text-muted">Learning Platform</p>
          </div>
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.path}
            onClick={() => { navigate(item.path); setSidebarOpen(false) }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
              isActive(item.path)
                ? 'bg-primary/15 text-primary border border-primary/20'
                : 'text-muted hover:text-text hover:bg-white/5'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}

        {/* Children section */}
        {children.length > 0 && (
          <div className="pt-2">
            <button
              onClick={() => setChildrenOpen(!childrenOpen)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-muted hover:text-text hover:bg-white/5 transition-all"
            >
              <Baby size={18} />
              <span className="flex-1 text-left">Children</span>
              <ChevronDown size={16} className={`transition-transform ${childrenOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {childrenOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  {children.map(child => (
                    <button
                      key={child.id}
                      onClick={() => { navigate(`/parent/child/${child.id}`); setSidebarOpen(false) }}
                      className={`w-full flex items-center gap-3 pl-11 pr-4 py-2.5 rounded-xl text-sm transition-all ${
                        isActive(`/parent/child/${child.id}`)
                          ? 'text-primary bg-primary/10'
                          : 'text-muted hover:text-text hover:bg-white/5'
                      }`
                    }
                    >
                      <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs" style={{ backgroundColor: child.avatar_color }}>
                        {child.gender === 'male' ? '👦' : child.gender === 'female' ? '👧' : '👶'}
                      </div>
                      <span className="truncate">{child.name}</span>
                      <ChevronRight size={14} className="ml-auto opacity-50" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-sm">
            👨‍👩‍👧
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{user?.display_name || 'Parent'}</p>
            <p className="text-xs text-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg hover:bg-red-500/20 text-muted hover:text-red-400 transition-colors"
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-dark-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col glass-card border-r border-white/5 fixed inset-y-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25 }}
              className="fixed inset-y-0 left-0 w-72 glass-card border-r border-white/5 z-50 lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 glass-card border-b border-white/5 px-4 h-14 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 rounded-xl hover:bg-white/5">
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-base">🌮</div>
            <span className="font-bold gradient-text">TacoTutor</span>
          </div>
          <div className="w-9" /> {/* spacer */}
        </header>

        <main className="min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
