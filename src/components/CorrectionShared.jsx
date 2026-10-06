import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/LanguageContext'
import { correctionCopy } from '../i18n/correctionCopy'
import { CORRECTION_PRODUCTS, productName, priceLabel } from '../lib/correctionProducts'
export function ProductCards() {
  const { language, path } = useLanguage(),
    c = correctionCopy(language)
  return (
    <div className="correction-grid">
      {Object.values(CORRECTION_PRODUCTS).map((p) => (
        <article
          key={p.id}
          className={`card correction-product ${p.id === 'q54' ? 'featured' : ''}`}
        >
          <span className="correction-kicker">
            {p.id === 'q54' ? c.recommended : `TOPIK II ${p.questionNumbers.join(' + ')}`}
          </span>
          <h3>{productName(p, language)}</h3>
          <strong className="correction-price">{priceLabel(p.price)}</strong>
          <p>{c.paid}</p>
          <p>{c.sla}</p>
          <Link className="button button-primary" to={`${path('/correction')}?product=${p.id}`}>
            {c.choose}
          </Link>
        </article>
      ))}
    </div>
  )
}
export function TeacherCta({ question = 54, answerId }) {
  const { language, path } = useLanguage(),
    c = correctionCopy(language)
  return (
    <aside className="teacher-cta">
      <p>{c.teacherCta}</p>
      <Link
        className="button button-outline"
        to={`${path('/correction')}?question=${question}${answerId ? `&answerId=${encodeURIComponent(answerId)}` : ''}`}
      >
        {c.teacherLink}
      </Link>
    </aside>
  )
}
