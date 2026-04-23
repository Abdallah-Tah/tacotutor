import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Home, Settings, Users, LogOut } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const location = useLocation()

  const isActive = (path: string) => location.pathname.startsWith(path)

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-lg">
              🌮
            </div>
            <span className="font-bold text-xl gradient-text">TacoTutor</span>
          </Link>

          <div className="flex items-center gap-1">
            <NavLink to="/parent" icon={<Home size={18} />} label="Dashboard" active={isActive('/parent')} />
            <NavLink to="/lessons" icon={<BookOpen size={18} />} label="Lessons" active={isActive('/lessons')} />
            <NavLink to="/instructions" icon={<Settings size={18} />} label="Instructions" active={isActive('/instructions')} />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted hidden sm:block">{user?.email}</span>
            <button
              onClick={logout}
              className="p-2 rounded-xl hover:bg-dark-card-hover transition-colors text-muted hover:text-secondary"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}

function NavLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`relative px-3 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold transition-colors ${
        active ? 'text-primary' : 'text-muted hover:text-text'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
      {active && (
        <motion.div
          layoutId="nav-indicator"
          className="absolute bottom-0 left-1 right-1 h-0.5 bg-primary rounded-full"
        />
      )}
    </Link>
  )
}
