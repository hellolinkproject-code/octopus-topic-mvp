import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Flame,
  PenLine,
  Play,
  Trophy,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button, Card, ProgressBar } from '../components/ui'
import { useApp } from '../context/AppContext'
import { weeklyActivity } from '../data/mockData'
import { getDailyQuiz } from '../lib/dailyContent'
import { useLanguage } from '../i18n/LanguageContext'
import { isWritingTask } from '../lib/writingTask'
export default function DashboardPage() {
  const { user, points, completedQuizIds, answers } = useApp()
  const { t, path, locale } = useLanguage()
  const navigate = useNavigate()
  const writingAnswers = answers.filter((answer) => isWritingTask(answer.promptNumber))
  const quizDone = completedQuizIds.includes(getDailyQuiz().id)
  const today = new Intl.DateTimeFormat(locale, {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
  const max = Math.max(...weeklyActivity.map((i) => i.value))
  return (
    <Layout>
      <main className="dashboard page-width">
        <div className="dashboard-greeting">
          <div>
            <span>{today}</span>
            <h1>
              {user.name}
              {t('dashboard.greeting')} <em>{t('dashboard.step')}</em> {t('dashboard.question')}
            </h1>
            <p>{t('dashboard.subtitle')}</p>
          </div>
          <div className="greeting-reward">
            <img src="/assets/mascot-feedback.png" alt="Octo" />
            <div className="streak-badge">
              <Flame />
              <span>
                <b>
                  {completedQuizIds.length + writingAnswers.length}
                  {t('common.days')}
                </b>{' '}
                {t('dashboard.record')}
              </span>
            </div>
          </div>
        </div>
        <section className="stats-grid">
          <Card>
            <span className="stat-label">{t('dashboard.points')}</span>
            <strong>
              {points.toLocaleString(locale)} <small>P</small>
            </strong>
            <span className="stat-note purple">
              <Trophy size={14} /> {t('dashboard.pointsNote')}
            </span>
          </Card>
          <Card>
            <span className="stat-label">{t('dashboard.completed')}</span>
            <strong>
              {completedQuizIds.length + writingAnswers.length} <small>{t('common.items')}</small>
            </strong>
            <span className="stat-note">
              <CheckCircle2 size={14} /> {t('dashboard.completedNote')}
            </span>
          </Card>
          <Card>
            <span className="stat-label">{t('dashboard.written')}</span>
            <strong>
              {writingAnswers.length} <small>{t('common.items')}</small>
            </strong>
            <Link to={path('/answers')}>
              {t('dashboard.view')} <ChevronRight size={14} />
            </Link>
          </Card>
        </section>
        <div className="dashboard-grid">
          <div className="dashboard-main">
            <div className="block-title">
              <div>
                <span>TODAY'S MISSION</span>
                <h2>{t('dashboard.today')}</h2>
              </div>
              <small>{t('dashboard.daily')}</small>
            </div>
            <Card className="mission-card featured">
              <div className="mission-icon">
                <Play fill="currentColor" />
              </div>
              <div className="mission-body">
                <span className="tag">{t('common.reading')}</span>
                <h3>{t('dashboard.quizTitle')}</h3>
                <p>{t('dashboard.quizDesc')}</p>
                <div className="mission-meta">
                  <span>
                    <Clock3 size={15} /> {t('dashboard.threeMin')}
                  </span>
                  <span>{t('dashboard.quizReward')}</span>
                </div>
              </div>
              <Button
                variant={quizDone ? 'soft' : 'primary'}
                onClick={() => navigate(path('/quiz/today'))}
              >
                {quizDone ? t('dashboard.retry') : t('dashboard.quizStart')}{' '}
                <ArrowRight size={17} />
              </Button>
            </Card>
            <Card className="mission-card">
              <div className="mission-icon coral">
                <PenLine />
              </div>
              <div className="mission-body">
                <span className="tag coral-text">{t('common.writing')}</span>
                <h3>{t('dashboard.writeTitle')}</h3>
                <p>{t('dashboard.writeDesc')}</p>
                <div className="mission-meta">
                  <span>
                    <Clock3 size={15} /> {t('dashboard.fifteenMin')}
                  </span>
                  <span>{t('dashboard.writeReward')}</span>
                </div>
              </div>
              <Button variant="outline" onClick={() => navigate(path('/writing'))}>
                {t('dashboard.write')} <ArrowRight size={17} />
              </Button>
            </Card>
          </div>
          <aside className="dashboard-side">
            <Card className="weekly-card">
              <div className="block-title">
                <div>
                  <span>WEEKLY</span>
                  <h2>{t('dashboard.weekly')}</h2>
                </div>
                <b>{t('dashboard.questions')}</b>
              </div>
              <div className="bar-chart">
                {weeklyActivity.map((item) => (
                  <div key={item.day} className="bar-item">
                    <span
                      className={item.value === max ? 'active' : ''}
                      style={{ height: `${Math.max(12, (item.value / max) * 100)}%` }}
                    />
                    <small>{item.day}</small>
                  </div>
                ))}
              </div>
              <ProgressBar label={t('dashboard.weeklyGoal')} value={68} />
            </Card>
            <Card className="tip-card">
              <span>💡 {t('dashboard.tip')}</span>
              <p>{t('dashboard.tipText')}</p>
            </Card>
          </aside>
        </div>
      </main>
    </Layout>
  )
}
