export const WRITING_TASK = Object.freeze({
  GRAPH: 53,
  ESSAY: 54,
})

export const WRITING_TASK_NUMBERS = Object.freeze(Object.values(WRITING_TASK))

export const WRITING_REWARD = Object.freeze({
  [WRITING_TASK.GRAPH]: 30,
  [WRITING_TASK.ESSAY]: 50,
})

export const isWritingTask = (number) => WRITING_TASK_NUMBERS.includes(Number(number))

export const isGraphTask = (number) => Number(number) === WRITING_TASK.GRAPH

export const isEssayTask = (number) => Number(number) === WRITING_TASK.ESSAY

export const getWritingTaskNumber = (number) =>
  isWritingTask(number) ? Number(number) : WRITING_TASK.GRAPH

export const getWritingReward = (number) => WRITING_REWARD[Number(number)] ?? 0
