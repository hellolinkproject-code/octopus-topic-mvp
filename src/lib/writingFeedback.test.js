import { describe,expect,it } from 'vitest'
import { writingPromptBank } from '../data/mockData'
import { getWritingFeedback } from './writingFeedback'

describe('getWritingFeedback',()=>{
  it.each(writingPromptBank)('$title 예시 답안을 권장 분량으로 만든다',prompt=>{
    const feedback=getWritingFeedback(prompt)
    expect(feedback.modelAnswer.length).toBeGreaterThanOrEqual(prompt.minCharacters)
    expect(feedback.modelAnswer.length).toBeLessThanOrEqual(prompt.maxCharacters)
    expect(feedback.points).toHaveLength(3)
  })

  it('그래프의 마지막 기준 최고치와 가장 큰 차이를 해설한다',()=>{
    const feedback=getWritingFeedback(writingPromptBank[0])
    expect(feedback.points[0]).toContain('20대')
    expect(feedback.points[1]).toContain('60대')
  })
})
