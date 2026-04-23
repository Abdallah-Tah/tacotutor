import { Link, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Navbar from './Navbar'

export default function Layout() {
  const { isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link to="/login" className="btn-primary inline-block">Go to Login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      <Navbar />
      <main className="pt-16 min-h-screen">
        <Outlet />
      </main>
    </div>
  )
}
