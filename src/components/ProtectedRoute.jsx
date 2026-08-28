import { Navigate, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../i18n/LanguageContext'
export default function ProtectedRoute({ children }) {
  const { user } = useApp()
  const location = useLocation()
  const { path } = useLanguage()
  return user ? (
    children
  ) : (
    <Navigate to={path('/login')} replace state={{ from: location.pathname }} />
  )
}
