import { ArrowRight, Award, BookOpenCheck, Check, PencilLine, Sparkles, Timer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button, Card } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../i18n/LanguageContext'
const featureIcons = [
  <Timer key="timer" />,
  <PencilLine key="pencil" />,
  <BookOpenCheck key="book" />,
]
export default function LandingPage() {
  const navigate = useNavigate()
  const { user } = useApp()
  const { t, path } = useLanguage()
  const start = () => navigate(user ? path('/dashboard') : path('/login'))
  const features = t('landing.features')
  return (
    <Layout>
      <main>
        <section className="hero page-width">
          <div className="hero-copy">
            <div className="eyebrow">
              <Sparkles size={16} /> {t('landing.eyebrow')}
            </div>
            <h1>
              {t('landing.before')}
              <br />
              <em>{t('landing.strong')}</em> {t('landing.after')}
            </h1>
            <p className="preserve-lines">{t('landing.description')}</p>
            <div className="hero-actions">
              <Button size="lg" onClick={start}>
                {user ? t('landing.continue') : t('landing.start')} <ArrowRight size={18} />
              </Button>
              <span>
                <Check size={16} /> {t('landing.free')}
              </span>
            </div>
          </div>
          <div className="hero-visual brand-hero-visual" aria-label={t('landing.visual')}>
            <div className="hero-glow" />
            <img
              className="hero-brand-illustration"
              src="/assets/hero-illustration.svg"
              alt={t('landing.visualAlt')}
            />
            <div className="floating-pill">
              <Award size={18} /> {t('landing.mission')}
            </div>
            <div className="hero-mini-card">
              <span>{t('landing.goal')}</span>
              <strong>{t('landing.goalText')}</strong>
              <div className="mini-progress">
                <span style={{ width: '72%' }} />
              </div>
            </div>
          </div>
        </section>
        <section className="trust-strip">
          <span>{t('landing.trust')}</span>
          {t('landing.trustItems').map((item, index) => (
            <span className="trust-item" key={item}>
              <strong>{item}</strong>
              {index < t('landing.trustItems').length - 1 ? <i /> : null}
            </span>
          ))}
        </section>
        <section className="features page-width">
          <div className="section-heading">
            <span>{t('landing.kicker')}</span>
            <h2>{t('landing.title')}</h2>
            <p>{t('landing.intro')}</p>
          </div>
          <div className="feature-grid">
            {features.map((feature, index) => (
              <Card key={feature[0]}>
                <div className={`icon-box ${['lilac', 'peach', 'mint'][index]}`}>
                  {featureIcons[index]}
                </div>
                <h3>{feature[0]}</h3>
                <p>{feature[1]}</p>
              </Card>
            ))}
          </div>
        </section>
        <section className="cta-band page-width">
          <div>
            <span>{t('landing.ctaKicker')}</span>
            <h2>{t('landing.ctaTitle')}</h2>
          </div>
          <Button variant="light" size="lg" onClick={start}>
            {t('landing.cta')} <ArrowRight size={18} />
          </Button>
        </section>
      </main>
    </Layout>
  )
}
