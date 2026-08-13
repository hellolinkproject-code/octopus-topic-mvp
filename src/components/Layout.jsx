import { BookOpenText, LogOut, Menu, Octagon, X } from 'lucide-react'
import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { Button } from './ui'
export function Brand(){return <Link to="/" className="brand" aria-label="옥토퍼스 토픽 홈"><span className="logo-mark">O</span><span>옥토퍼스 <b>토픽</b></span></Link>}
export default function Layout({children,simple=false}){
 const {user,points,logout}=useApp();const [menuOpen,setMenuOpen]=useState(false);const navigate=useNavigate()
 const handleLogout=()=>{logout();setMenuOpen(false);navigate('/')}
 return <div className="app-shell"><header className="site-header"><div className="header-inner"><Brand/>{!simple&&user?<><button className="menu-toggle" onClick={()=>setMenuOpen(v=>!v)} aria-label="메뉴 열기" aria-expanded={menuOpen}>{menuOpen?<X/>:<Menu/>}</button><nav className={menuOpen?'main-nav open':'main-nav'} aria-label="주요 메뉴"><NavLink to="/dashboard" onClick={()=>setMenuOpen(false)}>대시보드</NavLink><NavLink to="/quiz/today" onClick={()=>setMenuOpen(false)}>오늘의 퀴즈</NavLink><NavLink to="/answers" onClick={()=>setMenuOpen(false)}>53번 답안</NavLink><div className="point-chip"><Octagon size={15}/>{points.toLocaleString()} P</div><Button variant="ghost" size="sm" onClick={handleLogout}><LogOut size={16}/> 로그아웃</Button></nav></>:<div className="header-actions"><Link className="text-link" to="/login">로그인</Link><Button size="sm" onClick={()=>navigate('/login')}>무료로 시작하기</Button></div>}</div></header>{children}<footer className="site-footer"><Brand/><p><BookOpenText size={16}/> 오늘의 한 문제가 합격에 가까워지게 합니다.</p><span>© 2026 Octopus TOPIK</span></footer></div>
}
