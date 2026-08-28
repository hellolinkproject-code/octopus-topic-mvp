import { describe, expect, it } from 'vitest'
import {
  getWritingReward,
  getWritingTaskNumber,
  isEssayTask,
  isGraphTask,
  isWritingTask,
  WRITING_TASK,
  WRITING_TASK_NUMBERS,
} from './writingTask'

describe('writing task policy', () => {
  it('defines the supported TOPIK writing tasks in one place', () => {
    expect(WRITING_TASK_NUMBERS).toEqual([WRITING_TASK.GRAPH, WRITING_TASK.ESSAY])
    expect(isWritingTask(53)).toBe(true)
    expect(isWritingTask('54')).toBe(true)
    expect(isWritingTask(55)).toBe(false)
  })

  it('returns the reward configured for each writing task', () => {
    expect(getWritingReward(WRITING_TASK.GRAPH)).toBe(30)
    expect(getWritingReward(WRITING_TASK.ESSAY)).toBe(50)
    expect(getWritingReward(55)).toBe(0)
  })

  it('normalizes invalid route values to the graph task', () => {
    expect(getWritingTaskNumber('54')).toBe(WRITING_TASK.ESSAY)
    expect(getWritingTaskNumber('invalid')).toBe(WRITING_TASK.GRAPH)
    expect(isGraphTask(53)).toBe(true)
    expect(isEssayTask(54)).toBe(true)
  })
})
