import { ArrowRight, CheckCircle2, Home, RotateCcw, Sparkles, XCircle } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button, Card } from '../components/ui'
import { getDailyQuiz } from '../lib/dailyContent'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../i18n/LanguageContext'
export default function QuizResultPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const { t, path } = useLanguage()
  const { latestQuizResult } = useApp()
  const result = state?.result || latestQuizResult
  if (!result)
    return (
      <Layout>
        <main className="empty-page page-width">
          <h1>{t('result.emptyTitle')}</h1>
          <p>{t('result.emptyText')}</p>
          <Button onClick={() => navigate(path('/quiz/today'))}>{t('result.start')}</Button>
        </main>
      </Layout>
    )
  const selections = result.selections || []
  const quizQuestions = result.questions || getDailyQuiz().questions
  return (
    <Layout>
      <main className="result-page page-width narrow">
        <section className="result-hero">
          <div className="score-ring" style={{ '--score': `${result.score * 3.6}deg` }}>
            <div>
              <strong>{result.score}</strong>
              <span>{t('result.score')}</span>
            </div>
          </div>
          <div>
            <span className="eyebrow">
              <Sparkles size={16} /> {t('result.complete')}
            </span>
            <h1>{result.score >= 70 ? t('result.great') : t('result.good')}</h1>
            <p>
              {result.correctCount}
              {t('result.correctSuffix')}
            </p>
            <div className="earned">
              <b>+{result.earnedPoints} P</b>
              <span>{result.awarded === false ? t('result.already') : t('result.earned')}</span>
            </div>
          </div>
        </section>
        <div className="result-summary">
          <Card>
            <span>{t('result.correct')}</span>
            <b>
              {result.correctCount} / {result.total}
            </b>
          </Card>
          <Card>
            <span>{t('result.rate')}</span>
            <b>{result.score}%</b>
          </Card>
          <Card>
            <span>{t('result.points')}</span>
            <b>+{result.earnedPoints} P</b>
          </Card>
        </div>
        <div className="review-header">
          <div>
            <span>{t('result.review')}</span>
            <h2>{t('result.answers')}</h2>
          </div>
          <Link to={path('/quiz/today')}>
            <RotateCcw size={16} /> {t('result.retry')}
          </Link>
        </div>
        <div className="review-list">
          {quizQuestions.map((question, index) => {
            const correct = selections[index] === question.answer
            return (
              <Card key={question.id} className="review-card">
                <div className={correct ? 'review-status correct' : 'review-status wrong'}>
                  {correct ? <CheckCircle2 /> : <XCircle />}
                  {correct ? t('result.correct') : t('result.wrong')}
                </div>
                <h3>
                  {index + 1}. {question.text}
                </h3>
                <p className="review-passage">{question.passage}</p>
                <div className="answer-row">
                  <span>
                    {t('result.my')}{' '}
                    <b>
                      {selections[index] !== undefined
                        ? `${selections[index] + 1}. ${question.options[selections[index]]}`
                        : t('result.noRecord')}
                    </b>
                  </span>
                  {!correct ? (
                    <span>
                      {t('result.correct')}{' '}
                      <b>
                        {question.answer + 1}. {question.options[question.answer]}
                      </b>
                    </span>
                  ) : null}
                </div>
                <div className="explanation">
                  <b>{t('result.explanation')}</b>
                  <p>{question.explanation}</p>
                </div>
              </Card>
            )
          })}
        </div>
        <div className="result-actions">
          <Button variant="outline" onClick={() => navigate(path('/dashboard'))}>
            <Home size={17} /> {t('result.dashboard')}
          </Button>
          <Button onClick={() => navigate(path('/answers/new'))}>
            {t('result.write')} <ArrowRight size={17} />
          </Button>
        </div>
      </main>
    </Layout>
  )
}
