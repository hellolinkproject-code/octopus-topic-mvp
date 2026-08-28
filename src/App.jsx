import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { LoadingScreen } from './components/ui'
import { useApp } from './context/AppContext'
import { supportedLanguages } from './i18n/translations'
import { WRITING_TASK } from './lib/writingTask'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import QuizPage from './pages/QuizPage'
import QuizResultPage from './pages/QuizResultPage'
import WriteAnswerPage from './pages/WriteAnswerPage'
import WritingHomePage from './pages/WritingHomePage'
import AnswersPage from './pages/AnswersPage'
import AnswerDetailPage from './pages/AnswerDetailPage'
import NotFoundPage from './pages/NotFoundPage'
const protect = (page) => <ProtectedRoute>{page}</ProtectedRoute>
function LanguageRoute({ children }) {
  const { lang } = useParams()
  return supportedLanguages.includes(lang) ? children : <Navigate to="/ko/" replace />
}
function LegacyRedirect() {
  const location = useLocation()
  let language = 'ko'
  try {
    const saved = localStorage.getItem('octopus-topic-language')
    if (supportedLanguages.includes(saved)) language = saved
    else {
      const browser = navigator.language.toLowerCase()
      language = supportedLanguages.find((code) => browser.startsWith(code)) || 'ko'
    }
  } catch {}
  return (
    <Navigate
      to={`/${language}${location.pathname === '/' ? '/' : location.pathname}${location.search}${location.hash}`}
      replace
    />
  )
}
function LegacyAnswerRedirect() {
  const { lang } = useParams()
  return <Navigate to={`/${lang}/writing/${WRITING_TASK.GRAPH}/new`} replace />
}
const localized = (page) => <LanguageRoute>{page}</LanguageRoute>
export default function App() {
  const { isInitializing } = useApp()
  if (isInitializing) return <LoadingScreen />
  return (
    <Routes>
      <Route path="/" element={<LegacyRedirect />} />
      <Route path="/login" element={<LegacyRedirect />} />
      <Route path="/dashboard" element={<LegacyRedirect />} />
      <Route path="/quiz/*" element={<LegacyRedirect />} />
      <Route path="/writing/*" element={<LegacyRedirect />} />
      <Route path="/answers/*" element={<LegacyRedirect />} />
      <Route path="/:lang/" element={localized(<LandingPage />)} />
      <Route path="/:lang/login" element={localized(<LoginPage />)} />
      <Route path="/:lang/dashboard" element={localized(protect(<DashboardPage />))} />
      <Route path="/:lang/quiz/today" element={localized(protect(<QuizPage />))} />
      <Route path="/:lang/quiz/result" element={localized(protect(<QuizResultPage />))} />
      <Route path="/:lang/writing" element={localized(protect(<WritingHomePage />))} />
      <Route
        path="/:lang/writing/:questionNumber/new"
        element={localized(protect(<WriteAnswerPage />))}
      />
      <Route path="/:lang/answers/new" element={localized(protect(<LegacyAnswerRedirect />))} />
      <Route path="/:lang/answers" element={localized(protect(<AnswersPage />))} />
      <Route path="/:lang/answers/:id" element={localized(protect(<AnswerDetailPage />))} />
      <Route path="/:lang/*" element={localized(<NotFoundPage />)} />
      <Route path="*" element={<LegacyRedirect />} />
    </Routes>
  )
}
