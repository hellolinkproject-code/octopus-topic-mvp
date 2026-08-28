const joinValues = (prompt, seriesKey) => prompt.chartData
  .map(group => `${group.label} ${group.values.find(item => item.series === seriesKey).value}%`)
  .join(', ')

export function getWritingFeedback(prompt) {
  if(prompt.number===54)return {
    outline:prompt.outline,
    points:[
      '세 가지 과제를 빠짐없이 다루고 주제와 직접 관련된 내용으로 구성해야 한다.',
      '도입·근거·해결 방안·결론의 역할을 분명히 하고 연결 표현을 활용해야 한다.',
      '구어적인 표현을 피하고 격식에 맞는 문법과 어휘를 정확하게 사용해야 한다.',
    ],
  }
  const [firstSeries, secondSeries] = prompt.series
  const comparisons = prompt.chartData.map(group => {
    const first = group.values.find(item => item.series === firstSeries.key).value
    const second = group.values.find(item => item.series === secondSeries.key).value
    return { label:group.label, first, second, difference:second-first }
  })
  const byDifference = [...comparisons].sort((a,b)=>Math.abs(b.difference)-Math.abs(a.difference))
  const largest = byDifference[0]
  const smallest = byDifference.at(-1)
  const highestSecond = [...comparisons].sort((a,b)=>b.second-a.second)[0]
  const allUp = comparisons.every(item=>item.difference>0)
  const allDown = comparisons.every(item=>item.difference<0)
  const trend = allUp
    ? `모든 항목에서 ${secondSeries.label}의 수치가 ${firstSeries.label}보다 높아 전반적으로 증가한 것으로 나타났다.`
    : allDown
      ? `모든 항목에서 ${secondSeries.label}의 수치가 ${firstSeries.label}보다 낮아 전반적으로 감소한 것으로 나타났다.`
      : `항목에 따라 ${secondSeries.label}의 수치가 증가하거나 감소해 서로 다른 양상을 보였다.`
  const comparesYears = /년/.test(firstSeries.label+secondSeries.label)
  const comparisonLabel = comparesYears ? '변화 폭' : '두 집단의 차이'
  const largestDirection = largest.difference>=0
    ? (comparesYears?'높아졌다':'높았다')
    : (comparesYears?'낮아졌다':'낮았다')

  return {
    modelAnswer:`이 자료는 ${firstSeries.label}과 ${secondSeries.label}의 ${prompt.title}을 비교한 것이다. ${firstSeries.label}에는 ${joinValues(prompt,firstSeries.key)}로 나타났으며, ${secondSeries.label}에는 ${joinValues(prompt,secondSeries.key)}로 조사되었다. ${comparisonLabel}을 보면 ${largest.label} 항목이 ${Math.abs(largest.difference)}%포인트로 가장 컸으며, ${secondSeries.label}에는 ${firstSeries.label}보다 ${Math.abs(largest.difference)}%포인트 ${largestDirection}. 반면 ${smallest.label}의 차이는 ${Math.abs(smallest.difference)}%포인트로 가장 작았다. ${trend}`,
    points:[
      `${secondSeries.label} 기준 가장 높은 항목은 ${highestSecond.label}로 ${highestSecond.second}%이다.`,
      `${comparisonLabel}이 가장 큰 항목은 ${largest.label}이며 차이는 ${Math.abs(largest.difference)}%포인트이다.`,
      '개인적인 의견이나 원인을 덧붙이지 않고 수치와 비교 관계를 객관적으로 서술하는 것이 중요하다.',
    ],
  }
}
