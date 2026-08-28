import { Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button } from '../components/ui'
import { useLanguage } from '../i18n/LanguageContext'
export default function NotFoundPage() {
  const navigate = useNavigate()
  const { t, path } = useLanguage()
  return (
    <Layout>
      <main className="empty-page page-width">
        <span className="big-404">404</span>
        <h1>{t('notFound.title')}</h1>
        <p>{t('notFound.text')}</p>
        <Button onClick={() => navigate(path('/'))}>
          <Home size={17} /> {t('common.home')}
        </Button>
      </main>
    </Layout>
  )
}
