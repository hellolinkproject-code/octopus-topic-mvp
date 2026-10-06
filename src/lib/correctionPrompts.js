import { essayPromptBank, writingPromptBank } from '../data/mockData'

export function correctionPrompts(number) {
  return number === 53 ? writingPromptBank : essayPromptBank
}

export function correctionQuestionText(prompt) {
  if (!prompt) return ''
  const rows = (prompt.chartData || []).map(
    (row) =>
      `${row.label}: ${row.values.map((item) => `${prompt.series.find((series) => series.key === item.series)?.label}: ${item.value}`).join(', ')}`,
  )
  return [
    `TOPIK II ${prompt.number} · ${prompt.title}`,
    prompt.description,
    prompt.topic,
    ...rows,
    ...prompt.questions,
    prompt.source,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function correctionSavedAnswer(answer) {
  const prompt = correctionPrompts(answer.promptNumber).find((item) => item.id === answer.promptId)
  return {
    source: `answer:${answer.id}`,
    questionText: correctionQuestionText(prompt),
    answerText: answer.content,
    file: null,
  }
}
