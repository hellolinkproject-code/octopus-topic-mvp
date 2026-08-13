import { Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { LoadingScreen } from './components/ui'
import { useApp } from './context/AppContext'
import LandingPage from './pages/LandingPage';import LoginPage from './pages/LoginPage';import DashboardPage from './pages/DashboardPage';import QuizPage from './pages/QuizPage';import QuizResultPage from './pages/QuizResultPage';import WriteAnswerPage from './pages/WriteAnswerPage';import AnswersPage from './pages/AnswersPage';import AnswerDetailPage from './pages/AnswerDetailPage';import NotFoundPage from './pages/NotFoundPage'
const protect=page=><ProtectedRoute>{page}</ProtectedRoute>
export default function App(){const {isInitializing}=useApp();if(isInitializing)return <LoadingScreen/>;return <Routes><Route path="/" element={<LandingPage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/dashboard" element={protect(<DashboardPage/>)}/><Route path="/quiz/today" element={protect(<QuizPage/>)}/><Route path="/quiz/result" element={protect(<QuizResultPage/>)}/><Route path="/answers/new" element={protect(<WriteAnswerPage/>)}/><Route path="/answers" element={protect(<AnswersPage/>)}/><Route path="/answers/:id" element={protect(<AnswerDetailPage/>)}/><Route path="*" element={<NotFoundPage/>}/></Routes>}
