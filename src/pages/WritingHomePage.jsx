import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Crown,
  FilePenLine,
  FolderOpen,
  LockKeyhole,
  Sparkles,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button, Card } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../i18n/LanguageContext'
import { getWritingReward, WRITING_TASK } from '../lib/writingTask'

export default function WritingHomePage() {
  const { answers } = useApp()
  const { t, path } = useLanguage()
  const navigate = useNavigate()
  const count = (number) => answers.filter((answer) => answer.promptNumber === number).length
  const tasks = [
    {
      number: WRITING_TASK.GRAPH,
      icon: <BarChart3 />,
      title: t('writingHome.q53Title'),
      description: t('writingHome.q53Text'),
      meta: t('writingHome.q53Meta'),
    },
    {
      number: WRITING_TASK.ESSAY,
      icon: <FilePenLine />,
      title: t('writingHome.q54Title'),
      description: t('writingHome.q54Text'),
      meta: t('writingHome.q54Meta'),
    },
  ]
  return (
    <Layout>
      <main className="writing-home page-width">
        <div className="writing-home-hero">
          <div>
            <span>TOPIK WRITING LAB</span>
            <h1>{t('writingHome.title')}</h1>
            <p>{t('writingHome.intro')}</p>
          </div>
          <Button variant="outline" onClick={() => navigate(path('/answers'))}>
            <FolderOpen size={17} />
            {t('writingHome.history')}
          </Button>
        </div>
        <section className="writing-choice-grid">
          {tasks.map((task) => (
            <Card className={`writing-choice q${task.number}`} key={task.number}>
              <div className="writing-choice-icon">{task.icon}</div>
              <div className="writing-choice-number">
                QUESTION <b>{task.number}</b>
              </div>
              <h2>{task.title}</h2>
              <p>{task.description}</p>
              <div className="writing-choice-meta">
                <span>{task.meta}</span>
                <span>+{getWritingReward(task.number)} P</span>
                <span>
                  {count(task.number)}
                  {t('common.items')}
                </span>
              </div>
              <Button onClick={() => navigate(path(`/writing/${task.number}/new`))}>
                {t('writingHome.start')} <ArrowRight size={17} />
              </Button>
            </Card>
          ))}
        </section>
        <Card className="premium-intro">
          <div className="premium-icon">
            <Crown />
          </div>
          <div>
            <span>
              <Sparkles size={14} />
              {t('premium.badge')}
            </span>
            <h2>{t('premium.title')}</h2>
            <p>{t('premium.intro')}</p>
            <ul>
              <li>
                <BookOpenCheck />
                {t('premium.featureScore')}
              </li>
              <li>
                <FilePenLine />
                {t('premium.featureCorrection')}
              </li>
              <li>
                <Sparkles />
                {t('premium.featureRewrite')}
              </li>
            </ul>
          </div>
          <Button variant="soft" disabled>
            <LockKeyhole size={17} />
            {t('premium.soon')}
          </Button>
        </Card>
      </main>
    </Layout>
  )
}
