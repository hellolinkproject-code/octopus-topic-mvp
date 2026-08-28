import { ArrowRight,FileText,PenLine } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { Button,Card } from '../components/ui'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../i18n/LanguageContext'

export default function AnswersPage(){
 const {answers}=useApp();const {t,path,locale}=useLanguage();const navigate=useNavigate();const writingAnswers=answers.filter(answer=>[53,54].includes(answer.promptNumber))
 return <Layout><main className="answers-page page-width"><div className="page-heading-row"><div><span>MY WRITING</span><h1>{t('answers.title')}</h1><p>{t('answers.intro')}</p></div><Button onClick={()=>navigate(path('/writing'))}><PenLine size={17}/>{t('answers.new')}</Button></div>{writingAnswers.length===0?<Card className="empty-state"><div className="empty-icon"><FileText/></div><h2>{t('answers.emptyTitle')}</h2><p>{t('answers.emptyText')}</p><Button onClick={()=>navigate(path('/writing'))}>{t('answers.first')} <ArrowRight size={17}/></Button></Card>:<div className="answer-list">{writingAnswers.map(answer=>{const detailPath=path(`/answers/${answer.id}`);return <Card className="answer-item" key={answer.id} onClick={()=>navigate(detailPath)} tabIndex="0" onKeyDown={event=>event.key==='Enter'&&navigate(detailPath)}><div className="answer-number">{answer.promptNumber}</div><div className="answer-copy"><span>{new Intl.DateTimeFormat(locale,{year:'numeric',month:'long',day:'numeric'}).format(new Date(answer.createdAt))}</span><h2>{answer.title}</h2><p>{answer.content.slice(0,110)}{answer.content.length>110?'…':''}</p><div><span>{answer.characterCount}{t('common.characters')}</span><span>{answer.promptNumber===54?t('answers.essay'):t('answers.graph')}</span></div></div><ArrowRight className="answer-arrow"/></Card>})}</div>}</main></Layout>
}
