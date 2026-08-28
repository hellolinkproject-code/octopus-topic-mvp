import { describe, expect, it } from 'vitest'
import { getLanguageFromPath } from './LanguageContext'
import { languageOptions, supportedLanguages, translations } from './translations'

describe('multilingual routing and content', () => {
  it('supports the same six languages as the landing page', () => {
    expect(supportedLanguages).toEqual(['ko', 'en', 'zh', 'vi', 'mn', 'ja'])
    expect(languageOptions.every((option) => translations[option.code])).toBe(true)
  })
  it('reads only supported language prefixes', () => {
    expect(getLanguageFromPath('/en/quiz/today')).toBe('en')
    expect(getLanguageFromPath('/zh/')).toBe('zh')
    expect(getLanguageFromPath('/fr/')).toBe(null)
  })
  it('provides localized SEO and landing content for every language', () => {
    supportedLanguages.forEach((language) => {
      expect(translations[language].meta.title).toBeTruthy()
      expect(translations[language].meta.description).toBeTruthy()
      expect(translations[language].landing.features).toHaveLength(3)
      expect(translations[language].layout.language).toBeTruthy()
    })
  })
})
