export const quizQuestions = [
  { id:'today-1', number:1, text:'다음 밑줄 친 부분과 의미가 비슷한 것을 고르십시오.', passage:'이번 주말에는 비가 올 가능성이 높다고 합니다.', options:['틀림없다','그럴 수 있다','그럴 리 없다','그렇지 않다'], answer:1, explanation:'‘가능성이 높다’는 어떤 일이 일어날 확률이 크다는 뜻입니다. ‘그럴 수 있다’가 가장 비슷합니다.' },
  { id:'today-2', number:2, text:'다음 글의 중심 생각을 고르십시오.', passage:'규칙적으로 운동하면 몸이 건강해질 뿐만 아니라 스트레스도 줄일 수 있다. 하루에 짧은 시간이라도 꾸준히 운동하는 습관이 중요하다.', options:['운동 시간은 길수록 좋다.','운동은 스트레스를 만든다.','꾸준한 운동 습관이 중요하다.','건강을 위해 쉬어야 한다.'], answer:2, explanation:'글은 운동의 여러 장점을 말한 뒤, 짧게라도 꾸준히 하는 습관이 중요하다고 강조합니다.' },
  { id:'today-3', number:3, text:'빈칸에 들어갈 가장 알맞은 것을 고르십시오.', passage:'지하철이 많이 늦어서 약속 시간에 ____ 것 같습니다.', options:['도착할','도착한','도착하지 못할','도착하지 못한'], answer:2, explanation:'지하철이 늦는 현재 상황을 근거로 미래를 추측하므로 ‘도착하지 못할 것 같습니다’가 자연스럽습니다.' },
]

export const writingPrompt = {
  number:53,
  title:'온라인 쇼핑 이용률 변화',
  description:'다음은 2019년과 2024년의 연령대별 온라인 쇼핑 이용률을 조사한 결과이다. 조사 결과를 200~300자로 쓰십시오.',
  chartData:[
    {label:'20대',values:[{year:'2019',value:72},{year:'2024',value:91}]},
    {label:'40대',values:[{year:'2019',value:48},{year:'2024',value:79}]},
    {label:'60대',values:[{year:'2019',value:18},{year:'2024',value:52}]},
  ],
  questions:['전체적으로 온라인 쇼핑 이용률은 어떻게 변했습니까?','어느 연령대의 이용률이 가장 높습니까?','이용률 증가 폭이 가장 큰 연령대는 어디입니까?'],
  source:'옥토퍼스 생활 조사 (단위: %)',
  minCharacters:200,
  maxCharacters:300,
}

export const weeklyActivity = [{day:'월',value:3},{day:'화',value:5},{day:'수',value:4},{day:'목',value:7},{day:'금',value:6},{day:'토',value:2},{day:'일',value:0}]
