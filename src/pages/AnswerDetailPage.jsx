import { ArrowLeft, CalendarDays, FileText, PenLine } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button, Card } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../i18n/LanguageContext'
import { isWritingTask } from '../lib/writingTask'

export default function AnswerDetailPage() {
  const { id } = useParams()
  const { answers } = useApp()
  const { t, path, locale } = useLanguage()
  const navigate = useNavigate()
  const answer = answers.find((item) => item.id === id && isWritingTask(item.promptNumber))
  if (!answer)
    return (
      <Layout>
        <main className="empty-page page-width">
          <div className="empty-icon">
            <FileText />
          </div>
          <h1>{t('answers.notFound')}</h1>
          <p>{t('answers.notFoundText')}</p>
          <Button onClick={() => navigate(path('/answers'))}>{t('answers.list')}</Button>
        </main>
      </Layout>
    )
  return (
    <Layout>
      <main className="detail-page page-width narrow">
        <button className="back-link standalone" onClick={() => navigate(path('/answers'))}>
          <ArrowLeft size={16} /> {t('answers.list')}
        </button>
        <div className="detail-heading">
          <span>
            {t('common.writing')} {answer.promptNumber}
          </span>
          <h1>{answer.title}</h1>
          <div>
            <span>
              <CalendarDays size={16} />
              {new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(
                new Date(answer.createdAt),
              )}
            </span>
            <span>
              {answer.characterCount}
              {t('common.characters')}
            </span>
          </div>
        </div>
        <Card className="detail-card">
          <div className="paper-line">
            <b>{answer.promptNumber}</b>
            <span>{t('answers.my')}</span>
          </div>
          <article>{answer.content}</article>
        </Card>
        <div className="detail-actions">
          <Button variant="outline" onClick={() => navigate(path('/answers'))}>
            {t('answers.back')}
          </Button>
          <Button onClick={() => navigate(path(`/writing/${answer.promptNumber}/new`))}>
            <PenLine size={17} /> {t('answers.sameType')}
          </Button>
        </div>
      </main>
    </Layout>
  )
}
