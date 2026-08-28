import { ArrowLeft, ArrowRight, Check, Clock3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button, Card } from '../components/ui'
import { getDailyQuiz } from '../lib/dailyContent'
import { calculateQuizResult } from '../lib/progress'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../i18n/LanguageContext'
export default function QuizPage() {
  const navigate = useNavigate()
  const { t, path } = useLanguage()
  const { completeQuiz } = useApp()
  const dailyQuiz = useMemo(() => getDailyQuiz(), [])
  const quizQuestions = dailyQuiz.questions
  const [index, setIndex] = useState(0)
  const [selections, setSelections] = useState(Array(quizQuestions.length).fill(null))
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const question = quizQuestions[index]
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [index])
  const next = () => {
    if (selections[index] === null) {
      setError(t('quiz.selectError'))
      return
    }
    setError('')
    if (index < quizQuestions.length - 1) {
      setIndex(index + 1)
      return
    }
    setSubmitting(true)
    setTimeout(() => {
      const result = {
        ...calculateQuizResult(quizQuestions, selections),
        selections,
        questions: quizQuestions,
        quizId: dailyQuiz.id,
        quizDate: dailyQuiz.dateKey,
        completedAt: new Date().toISOString(),
      }
      completeQuiz(dailyQuiz.id, result)
      navigate(path('/quiz/result'), { state: { result } })
    }, 550)
  }
  return (
    <Layout>
      <main className="quiz-page page-width narrow">
        <div className="quiz-header">
          <button onClick={() => (index ? setIndex(index - 1) : navigate(path('/dashboard')))}>
            <ArrowLeft />
            <span>{index ? t('quiz.previous') : t('quiz.exit')}</span>
          </button>
          <div>
            <span>{t('quiz.title')}</span>
            <b>
              {index + 1} / {quizQuestions.length}
            </b>
          </div>
          <span className="quiz-time">
            <Clock3 size={16} /> {t('quiz.time')}
          </span>
        </div>
        <div className="step-track">
          <span style={{ width: `${((index + 1) / quizQuestions.length) * 100}%` }} />
        </div>
        <Card className="question-card">
          <div className="question-top">
            <span className="question-number">{String(question.number).padStart(2, '0')}</span>
            <span>{question.type}</span>
          </div>
          <h1>{question.text}</h1>
          <div className="passage">{question.passage}</div>
          <fieldset className="options">
            <legend className="sr-only">{t('quiz.choose')}</legend>
            {question.options.map((option, optionIndex) => (
              <label key={option} className={selections[index] === optionIndex ? 'selected' : ''}>
                <input
                  type="radio"
                  name={`q-${index}`}
                  checked={selections[index] === optionIndex}
                  onChange={() => {
                    const nextSelections = [...selections]
                    nextSelections[index] = optionIndex
                    setSelections(nextSelections)
                    setError('')
                  }}
                />
                <span className="option-number">{optionIndex + 1}</span>
                <span>{option}</span>
                {selections[index] === optionIndex ? <Check className="option-check" /> : null}
              </label>
            ))}
          </fieldset>
          {error ? (
            <p className="inline-error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="quiz-actions">
            <span>{t('quiz.hint')}</span>
            <Button size="lg" onClick={next} loading={submitting}>
              {index === quizQuestions.length - 1 ? t('quiz.result') : t('quiz.next')}{' '}
              <ArrowRight size={18} />
            </Button>
          </div>
        </Card>
      </main>
    </Layout>
  )
}
