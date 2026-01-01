import '@/index.css'
import { StrictMode, useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { authService } from './lib/auth'

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)

  useEffect(() => {
    const handlePopState = () => setCurrentPath(window.location.pathname)
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  // Remove /admin prefix from path
  const path = currentPath.replace('/admin', '') || '/'

  // Auth protection
  const isAuth = authService.isAuthenticated()
  
  if (path === '/login' && isAuth) {
    window.location.href = '/admin/'
    return null
  }
  
  if (path !== '/login' && !isAuth) {
    window.location.href = '/admin/login'
    return null
  }

  if (path === '/login') {
    return <LoginPage />
  }

  return <HomePage />
}

const rootElement = document.getElementById('root')!
const root = ReactDOM.createRoot(rootElement)
root.render(
  <StrictMode>
    <App />
  </StrictMode>,
)


