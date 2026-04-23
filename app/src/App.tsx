import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/Layout'
import Welcome from '@/pages/Welcome'
import Login from '@/pages/auth/Login'
import Signup from '@/pages/auth/Signup'
import ParentDashboard from '@/pages/parent/ParentDashboard'
import ChildProfile from '@/pages/parent/ChildProfile'
import KidDashboard from '@/pages/kid/KidDashboard'
import LessonManagement from '@/pages/lesson/LessonManagement'
import LessonPlayer from '@/pages/lesson/LessonPlayer'
import LiveTutorSession from '@/pages/live/LiveTutorSession'
import InstructionsPage from '@/pages/lesson/InstructionsPage'

function App() {
  const { init } = useAuthStore()

  useEffect(() => {
    init()
  }, [])

  return (
    <Routes>
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route element={<Layout />}>
        <Route path="/parent" element={<ParentDashboard />} />
        <Route path="/parent/child/:childId" element={<ChildProfile />} />
        <Route path="/kid/:childId" element={<KidDashboard />} />
        <Route path="/lessons" element={<LessonManagement />} />
        <Route path="/play/:childId/:lessonId?" element={<LessonPlayer />} />
        <Route path="/live/:childId/:lessonId?" element={<LiveTutorSession />} />
        <Route path="/instructions" element={<InstructionsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
