import { Link } from 'react-router-dom'
import Layout from '../components/Layout'
import { ProductCards } from '../components/CorrectionShared'
import { useLanguage } from '../i18n/LanguageContext'
import { correctionCopy } from '../i18n/correctionCopy'
export default function LandingPage() {
  const { language, path } = useLanguage(),
    c = correctionCopy(language)
  return (
    <Layout>
      <main className="coach-landing">
        <section className="hero page-width coach-hero">
          <div className="hero-copy">
            <span className="eyebrow">TOPIK II 53·54 WRITING</span>
            <h1>
              TOPIK
              <br />
              <em>Writing Coach</em>
            </h1>
            <h2>{c.subtitle}</h2>
            <p>{c.description}</p>
            <div className="hero-actions">
              <Link className="button button-primary button-lg" to={path('/correction')}>
                {c.apply}
              </Link>
              <Link className="button button-outline" to={path('/writing')}>
                {c.practice}
              </Link>
            </div>
            <p className="coach-note">{c.sla}</p>
          </div>
          <div className="coach-visual">
            <img src="/assets/hero-illustration.svg" alt="" />
            <div className="card">
              <span className="correction-kicker">AI + TEACHER</span>
              <h2>53 / 54</h2>
              <p>{c.principle}</p>
              <span className="coach-tag">PDF CORRECTION</span>
            </div>
          </div>
        </section>
        <section className="coach-section page-width">
          <div className="section-heading">
            <span>TOPIK II WRITING</span>
            <h2>{c.focus}</h2>
          </div>
          <div className="correction-grid two">
            {c.skills.map((skills, i) => (
              <article className="card" key={i}>
                <span className="correction-kicker">QUESTION</span>
                <h3 className="coach-question-number">{53 + i}</h3>
                <ul>
                  {skills.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>
        <section className="coach-section page-width">
          <div className="section-heading">
            <span>AI + TEACHER</span>
            <h2>{c.together}</h2>
          </div>
          <div className="correction-grid">
            {c.steps.map((s, i) => (
              <article className="card" key={s}>
                <span className="correction-kicker">STEP 0{i + 1}</span>
                <h3>{s}</h3>
              </article>
            ))}
          </div>
          <p className="coach-note">{c.free}</p>
          <p className="coach-note">{c.paid}</p>
        </section>
        <section className="coach-section page-width" id="products">
          <div className="section-heading">
            <span>TEACHER CORRECTION</span>
            <h2>{c.products}</h2>
            <p>{c.slaDetail}</p>
          </div>
          <ProductCards />
        </section>
        <section className="coach-section page-width">
          <div className="section-heading">
            <span>PRE-LAUNCH SURVEY</span>
            <h2>{c.surveyTitle}</h2>
            <p>{c.surveyIntro}</p>
          </div>
          <div className="correction-grid survey-grid">
            {c.survey.map((s, i) => (
              <article className="card" key={i}>
                <p>{s}</p>
                <span className="correction-kicker">{c.surveyTag}</span>
              </article>
            ))}
          </div>
        </section>
        <section className="coach-section page-width">
          <div className="section-heading">
            <span>SAMPLE REPORT</span>
            <h2>{c.sampleTitle}</h2>
            <p>{c.sampleNote}</p>
          </div>
          <div className="card sample-report">
            {c.sample.map(([title, text]) => (
              <div key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="coach-section page-width">
          <div className="section-heading">
            <h2>{c.how}</h2>
            <p>{c.slaDetail}</p>
          </div>
          <ol className="correction-flow">
            {c.flow.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </section>
        <section className="coach-section page-width">
          <div className="section-heading">
            <h2>FAQ</h2>
          </div>
          <div className="correction-faq">
            {c.faq.map(([q, a]) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="cta-band page-width">
          <div>
            <span>TOPIK WRITING COACH</span>
            <h2>{c.final}</h2>
          </div>
          <Link className="button button-light" to={path('/correction')}>
            {c.submit}
          </Link>
        </section>
      </main>
    </Layout>
  )
}
