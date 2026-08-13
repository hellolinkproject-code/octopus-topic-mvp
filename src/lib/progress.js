export function calculateQuizResult(questions, selections) {
  const correctCount = questions.reduce((count,q,i)=>count+(selections[i]===q.answer?1:0),0)
  return { correctCount, total:questions.length, score:Math.round(correctCount/questions.length*100), earnedPoints:correctCount*10+20 }
}
export function awardQuiz(state, quizId, result) {
  if (state.completedQuizIds.includes(quizId)) return {...state,latestQuizResult:{...result,awarded:false}}
  return {...state,points:state.points+result.earnedPoints,completedQuizIds:[...state.completedQuizIds,quizId],latestQuizResult:{...result,awarded:true}}
}
